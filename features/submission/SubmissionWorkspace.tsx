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

export default function SubmissionWorkspace() {
  const [drafts, setDrafts] = useState<Draft[]>(() => sampleControllerSubmissions.map(toDraft));
  const [selectedKey, setSelectedKey] = useState<string>(() => drafts[0]?.key ?? '');
  const [locked, setLocked] = useState(false);
  const [progress, setProgress] = useState<BrowserEvaluationProgress | null>(null);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [runMessage, setRunMessage] = useState('');
  const activeRun = useRef<TournamentWorkerRun | null>(null);

  const selected = drafts.find((draft) => draft.key === selectedKey) ?? drafts[0];
  const analyses = useMemo(() => drafts.map((draft) => ({ draft, ...parseDraft(draft) })), [drafts]);
  const selectedAnalysis = analyses.find((entry) => entry.draft.key === selected?.key);
  const allValid = analyses.length >= 2 && analyses.every((entry) => entry.submission && entry.issues.length === 0);

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
    if (!allValid || !locked || runStatus === 'running') return;
    setRunStatus('running');
    setRunMessage('Starting tournament worker…');
    const run = runTournamentInWorker({
      submissions: submissions(),
      seeds: [11, 23, 37, 51, 79],
      engineVersion: '0.1.0',
      startupTimeoutMs: 1000,
      perTickTimeoutMs: 20,
    }, (next) => {
      setProgress(next);
      setRunMessage(next.phase === 'match' ? `Seed ${next.seed} · tick ${next.tick ?? 0} · match ${next.matchIndex + 1}/${next.matchCount}` : next.phase.toUpperCase());
    });
    activeRun.current = run;
    void run.promise.then(async (result) => {
      await saveTournamentArtifact(result.artifact);
      setRunStatus('complete');
      setRunMessage(`Completed ${result.records.length} matches · evidence saved locally. Open Tournament Lab to inspect the Three.js replay.`);
    }).catch((error) => {
      setRunStatus('error');
      setRunMessage(error instanceof Error ? error.message : String(error));
    }).finally(() => { activeRun.current = null; });
  };

  const cancelEvaluation = () => {
    activeRun.current?.cancel();
    activeRun.current = null;
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>AGENT FIGHTING / SUBMISSION WORKSPACE</div><h1>Write strategies. Validate source. Lock exact identities.</h1><p>Each locked controller runs in its own Worker; tournament orchestration runs in a separate Worker and resolves actions through the authoritative engine.</p></div>
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
          <div className={styles.lockBox}>
            <small>{locked?'LOCKED WORKSPACE':`${analyses.filter((entry)=>!entry.issues.length).length}/${analyses.length} READY`}</small>
            <button disabled={runStatus==='running'||(!allValid&&!locked)} onClick={()=>setLocked((value)=>!value)}>{locked?'Unlock edits':'Lock exact submissions'}</button>
            <button disabled={!allValid||runStatus==='running'} onClick={exportBundle}>Export submissions</button>
            <button disabled={!allValid||!locked||runStatus==='running'} onClick={runEvaluation}>Run isolated tournament</button>
            {runStatus==='running'&&<button onClick={cancelEvaluation}>Cancel tournament</button>}
          </div>
          {runStatus!=='idle'&&<div className={`${styles.runStatus} ${runStatus==='error'?styles.runError:runStatus==='complete'?styles.runComplete:''}`}><strong>{runStatus.toUpperCase()}</strong><span>{runMessage}</span>{progress?.phase==='match'&&<i style={{width:`${Math.min(100,((progress.matchIndex+(progress.tick??0)/(90*30))/progress.matchCount)*100)}%`}}/>}</div>}
          <p className={styles.note}>The UI lock prevents accidental edits; evaluation independently creates the canonical ControllerLock. Browser Workers provide fault isolation, not hostile multi-tenant security.</p>
        </aside>
      </section>
    </main>
  );
}
