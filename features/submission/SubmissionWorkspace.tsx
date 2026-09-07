'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { sampleControllerSubmissions } from '@/agents/sample-submissions';
import {
  controllerSubmissionSchema,
  createControllerId,
  createSourceHash,
  validateControllerSource,
  type ControllerSubmission,
} from '@/features/controllers';
import {
  runTournamentInWorker,
  saveTournamentArtifact,
  type BrowserEvaluationProgress,
  type TournamentWorkerRun,
} from '@/features/evaluation';
import styles from './SubmissionWorkspace.module.css';

type Draft = { key: string; agentId: string; model: string; strategyJson: string; source: string };

function toDraft(submission: ControllerSubmission, index: number): Draft {
  return { key: `${submission.agentId}-${index}-${Date.now()}`, agentId: submission.agentId, model: submission.model, strategyJson: JSON.stringify(submission.strategy, null, 2), source: submission.source };
}

function parseDraft(draft: Draft) {
  let strategy: unknown;
  let strategyError: string | null = null;
  try { strategy = JSON.parse(draft.strategyJson); } catch (error) { strategyError = error instanceof Error ? error.message : String(error); }
  const parsed = strategyError ? null : controllerSubmissionSchema.safeParse({ schemaVersion: 1, agentId: draft.agentId, model: draft.model, strategy, source: draft.source });
  const schemaIssues = parsed && !parsed.success ? parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) : [];
  const policyIssues = validateControllerSource(draft.source);
  return { submission: parsed?.success ? parsed.data : null, issues: [...(strategyError ? [`strategy: ${strategyError}`] : []), ...schemaIssues, ...policyIssues.map((issue) => `${issue.rule}: ${issue.message}`)] };
}

function parseSeeds(value: string): { seeds: number[]; error?: string } {
  const input = value.trim();
  if (!input) return { seeds: [], error: 'Enter one or more seeds.' };
  const range = input.match(/^(\d+)\s*-\s*(\d+)$/);
  let seeds: number[];
  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (end < start) return { seeds: [], error: 'Seed range end must be greater than or equal to start.' };
    seeds = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  } else {
    seeds = input.split(/[\s,]+/).filter(Boolean).map(Number);
  }
  if (seeds.some((seed) => !Number.isSafeInteger(seed) || seed < 0)) return { seeds: [], error: 'Seeds must be non-negative integers.' };
  seeds = [...new Set(seeds)];
  if (!seeds.length) return { seeds: [], error: 'Enter one or more seeds.' };
  if (seeds.length > 100) return { seeds: [], error: 'Browser tournaments are currently capped at 100 seeds.' };
  return { seeds };
}

export default function SubmissionWorkspace() {
  const [drafts, setDrafts] = useState<Draft[]>(() => sampleControllerSubmissions.map(toDraft));
  const [selectedKey, setSelectedKey] = useState<string>(() => drafts[0]?.key ?? '');
  const [locked, setLocked] = useState(false);
  const [seedSpec, setSeedSpec] = useState('11, 23, 37, 51, 79');
  const [progress, setProgress] = useState<BrowserEvaluationProgress | null>(null);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [runMessage, setRunMessage] = useState('');
  const activeRun = useRef<TournamentWorkerRun | null>(null);

  const selected = drafts.find((draft) => draft.key === selectedKey) ?? drafts[0];
  const analyses = useMemo(() => drafts.map((draft) => ({ draft, ...parseDraft(draft) })), [drafts]);
  const selectedAnalysis = analyses.find((entry) => entry.draft.key === selected?.key);
  const allValid = analyses.length >= 2 && analyses.every((entry) => entry.submission && entry.issues.length === 0);
  const seedConfig = useMemo(() => parseSeeds(seedSpec), [seedSpec]);

  const patchSelected = (patch: Partial<Draft>) => {
    if (!selected || locked) return;
    setDrafts((current) => current.map((draft) => draft.key === selected.key ? { ...draft, ...patch } : draft));
  };

  const addDraft = () => {
    if (locked) return;
    const base = sampleControllerSubmissions[0];
    const next = toDraft({ ...base, agentId: `agent-${drafts.length + 1}`, model: 'custom-model' }, drafts.length);
    setDrafts((current) => [...current, next]);
    setSelectedKey(next.key);
  };

  const removeSelected = () => {
    if (!selected || drafts.length <= 2 || locked) return;
    const index = drafts.findIndex((draft) => draft.key === selected.key);
    const next = drafts.filter((draft) => draft.key !== selected.key);
    setDrafts(next);
    setSelectedKey(next[Math.max(0, index - 1)]?.key ?? next[0]?.key ?? '');
  };

  const submissions = () => analyses.map((entry) => entry.submission as ControllerSubmission);

  const exportBundle = () => {
    if (!allValid) return;
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, submissions: submissions() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'agent-fighting-submissions.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runEvaluation = () => {
    if (!allValid || !locked || runStatus === 'running' || seedConfig.error) return;
    setRunStatus('running');
    setProgress(null);
    setRunMessage(`Starting ${seedConfig.seeds.length}-seed tournament worker…`);
    const run = runTournamentInWorker({
      submissions: submissions(),
      seeds: seedConfig.seeds,
      engineVersion: '0.1.0',
      startupTimeoutMs: 1000,
      perTickTimeoutMs: 20,
    }, (next) => {
      setProgress(next);
      if (next.phase === 'match') {
        const slowest = Object.entries(next.durationsMs ?? {}).sort((a, b) => b[1] - a[1])[0];
        setRunMessage(`Seed ${next.seed} · tick ${next.tick ?? 0} · match ${next.matchIndex + 1}/${next.matchCount}${slowest ? ` · slowest ${slowest[0]} ${slowest[1].toFixed(1)}ms` : ''}`);
      } else if (next.phase === 'match-complete') {
        const leader = next.partialTournament?.agents[0];
        setRunMessage(`Match ${next.matchIndex + 1}/${next.matchCount} complete${leader ? ` · leader ${leader.name} ${Math.round(leader.winRate * 100)}%` : ''}`);
      } else setRunMessage(next.phase.toUpperCase());
    });
    activeRun.current = run;
    void run.promise.then(async (result) => {
      await saveTournamentArtifact(result.artifact);
      const timeoutCount = Object.values(result.diagnostics.timedOut).reduce((sum, count) => sum + count, 0);
      const failureCount = Object.values(result.diagnostics.failed).reduce((sum, count) => sum + count, 0);
      const slowest = Object.entries(result.diagnostics.latency).sort((a, b) => b[1].averageMs - a[1].averageMs)[0];
      setRunStatus('complete');
      setRunMessage(`Completed ${result.records.length} matches · ${timeoutCount} timeouts · ${failureCount} failures${slowest ? ` · slowest avg ${slowest[0]} ${slowest[1].averageMs.toFixed(2)}ms` : ''}. Evidence saved locally.`);
    }).catch((error) => {
      setRunStatus('error');
      setRunMessage(error instanceof Error ? error.message : String(error));
    }).finally(() => { activeRun.current = null; });
  };

  const cancelEvaluation = () => { activeRun.current?.cancel(); activeRun.current = null; };
  const progressPercent = progress?.phase === 'match'
    ? Math.min(100, ((progress.matchIndex + (progress.tick ?? 0) / (90 * 30)) / progress.matchCount) * 100)
    : progress?.phase === 'match-complete'
      ? ((progress.matchIndex + 1) / progress.matchCount) * 100
      : progress?.phase === 'completed' ? 100 : 0;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>AGENT FIGHTING / SUBMISSION WORKSPACE</div><h1>Write strategies. Validate source. Lock exact identities.</h1><p>Each locked controller runs in its own Worker; a dedicated Tournament Worker streams progress and partial rankings while the authoritative engine resolves every tick.</p></div>
        <div className={styles.nav}><Link href="/">Live arena</Link><Link href="/tournament">Tournament Lab</Link></div>
      </header>

      <section className={styles.workspace}>
        <aside className={styles.list}>
          <div className={styles.listHeader}><span>PARTICIPANTS</span><button onClick={addDraft} disabled={locked}>+ Add</button></div>
          {analyses.map((entry,index)=><button key={entry.draft.key} className={`${styles.participant} ${selected?.key===entry.draft.key?styles.selected:''}`} onClick={()=>setSelectedKey(entry.draft.key)}><b>{String(index+1).padStart(2,'0')}</b><div><strong>{entry.draft.agentId||'unnamed'}</strong><small>{entry.draft.model||'no model'}</small></div><i className={entry.issues.length?styles.bad:styles.good}>{entry.issues.length?entry.issues.length:'✓'}</i></button>)}
          <button className={styles.remove} onClick={removeSelected} disabled={locked||drafts.length<=2}>Remove selected</button>
        </aside>

        {selected&&selectedAnalysis&&<section className={styles.editor}>
          <div className={styles.identityRow}><label>Agent ID<input value={selected.agentId} disabled={locked} onChange={(event)=>patchSelected({agentId:event.target.value})}/></label><label>Model<input value={selected.model} disabled={locked} onChange={(event)=>patchSelected({model:event.target.value})}/></label></div>
          <div className={styles.editGrid}><label className={styles.field}><span>STRATEGY MANIFEST · JSON</span><textarea value={selected.strategyJson} disabled={locked} onChange={(event)=>patchSelected({strategyJson:event.target.value})} spellCheck={false}/></label><label className={styles.field}><span>CONTROLLER SOURCE · JAVASCRIPT</span><textarea value={selected.source} disabled={locked} onChange={(event)=>patchSelected({source:event.target.value})} spellCheck={false}/></label></div>
        </section>}

        <aside className={styles.inspector}>
          <div className={styles.panelTitle}>VALIDATION</div>
          <div className={`${styles.validity} ${selectedAnalysis?.issues.length?styles.invalid:styles.valid}`}><strong>{selectedAnalysis?.issues.length?'NEEDS ATTENTION':'VALID'}</strong><span>{selectedAnalysis?.issues.length??0} issue(s)</span></div>
          <div className={styles.issueList}>{selectedAnalysis?.issues.map((issue)=><p key={issue}>{issue}</p>)}{!selectedAnalysis?.issues.length&&<p className={styles.ok}>Schema and source policy passed.</p>}</div>
          {selectedAnalysis?.submission&&<div className={styles.hashes}><span>SOURCE HASH</span><code>{createSourceHash(selectedAnalysis.submission.source)}</code><span>CONTROLLER ID</span><code>{createControllerId(selectedAnalysis.submission)}</code></div>}

          <div className={styles.seedConfig}>
            <span>TOURNAMENT SEEDS · max 100</span>
            <input value={seedSpec} disabled={runStatus==='running'} onChange={(event)=>setSeedSpec(event.target.value)} placeholder="11, 23, 37 or 1-50"/>
            <div><button onClick={()=>setSeedSpec('11, 23, 37, 51, 79')}>5 demo</button><button onClick={()=>setSeedSpec('1-20')}>20 seeds</button><button onClick={()=>setSeedSpec('1-50')}>50 seeds</button><button onClick={()=>setSeedSpec('1-100')}>100 seeds</button></div>
            <small className={seedConfig.error?styles.seedError:''}>{seedConfig.error??`${seedConfig.seeds.length} deterministic match seeds`}</small>
          </div>

          <div className={styles.lockBox}>
            <small>{locked?'LOCKED WORKSPACE':`${analyses.filter((entry)=>!entry.issues.length).length}/${analyses.length} READY`}</small>
            <button disabled={runStatus==='running'||(!allValid&&!locked)} onClick={()=>setLocked((value)=>!value)}>{locked?'Unlock edits':'Lock exact submissions'}</button>
            <button disabled={!allValid||runStatus==='running'} onClick={exportBundle}>Export submissions</button>
            <button disabled={!allValid||!locked||runStatus==='running'||Boolean(seedConfig.error)} onClick={runEvaluation}>Run isolated tournament</button>
            {runStatus==='running'&&<button onClick={cancelEvaluation}>Cancel tournament</button>}
          </div>
          {runStatus!=='idle'&&<div className={`${styles.runStatus} ${runStatus==='error'?styles.runError:runStatus==='complete'?styles.runComplete:''}`}><strong>{runStatus.toUpperCase()}</strong><span>{runMessage}</span><i style={{width:`${progressPercent}%`}}/></div>}
          <p className={styles.note}>The UI lock prevents accidental edits; evaluation independently creates the canonical ControllerLock. Browser Workers provide fault isolation, not hostile multi-tenant security.</p>
        </aside>
      </section>
    </main>
  );
}
