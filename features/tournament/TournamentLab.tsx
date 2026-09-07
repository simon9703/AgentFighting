'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { sampleControllerSubmissions } from '@/agents/sample-submissions';
import {
  createTournamentReport,
  evaluateControllerSubmissions,
  listTournamentArtifacts,
  parseTournamentArtifactJson,
  saveTournamentArtifact,
  serializeTournamentArtifact,
  type StoredTournamentArtifact,
  type SubmissionTournamentResult,
  type TournamentArtifact,
} from '@/features/evaluation';
import { createHighlightTimeline } from '@/features/replay';
import { createArenaViewModel } from '@/features/renderers/types';
import ThreeArenaViewport from '@/features/arena/ThreeArenaViewport';
import styles from './TournamentLab.module.css';

const FINGERPRINT_KEYS = ['aggression', 'accuracy', 'weaponUsage', 'edgeRisk', 'mobility', 'survival'] as const;

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resultFromArtifact(artifact: TournamentArtifact): SubmissionTournamentResult {
  return { agents: [], lock: artifact.lock, tournament: artifact.tournament, records: artifact.records, artifact };
}

export default function TournamentLab() {
  const [result, setResult] = useState<SubmissionTournamentResult | null>(null);
  const [running, setRunning] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const [tickIndex, setTickIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [selectedFighterId, setSelectedFighterId] = useState<string>();
  const [saved, setSaved] = useState<StoredTournamentArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const resetReplay = () => {
    setRecordIndex(0);
    setTickIndex(0);
    setReplayPlaying(false);
    setSelectedFighterId(undefined);
  };

  const refreshSaved = async () => {
    try { setSaved(await listTournamentArtifacts()); } catch { /* storage may be unavailable */ }
  };

  useEffect(() => { void refreshSaved(); }, []);

  const useArtifact = (artifact: TournamentArtifact) => {
    setResult(resultFromArtifact(artifact));
    resetReplay();
  };

  const run = () => {
    setRunning(true);
    setError(null);
    try {
      const next = evaluateControllerSubmissions({ submissions: sampleControllerSubmissions, seeds: [11, 23, 37, 51, 79], engineVersion: '0.1.0' });
      setResult(next);
      resetReplay();
      void saveTournamentArtifact(next.artifact).then(refreshSaved).catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setRunning(false); }
  };

  const importArtifact = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const artifact = parseTournamentArtifactJson(await file.text());
      useArtifact(artifact);
      await saveTournamentArtifact(artifact);
      await refreshSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const record = result?.records[recordIndex];
  const safeTickIndex = Math.min(tickIndex, Math.max(0, (record?.ticks.length ?? 1) - 1));
  const tick = record?.ticks[safeTickIndex];
  const highlights = useMemo(() => record ? createHighlightTimeline(record, 18) : [], [record]);
  const replayView = useMemo(() => tick ? createArenaViewModel(tick.state) : null, [tick]);

  useEffect(() => {
    if (!replayPlaying || !record) return;
    const interval = window.setInterval(() => {
      setTickIndex((current) => {
        const next = current + Math.max(1, Math.round(replaySpeed * 2));
        if (next >= record.ticks.length - 1) { setReplayPlaying(false); return Math.max(0, record.ticks.length - 1); }
        return next;
      });
    }, 1000 / 30);
    return () => window.clearInterval(interval);
  }, [record, replayPlaying, replaySpeed]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>AGENT FIGHTING / TOURNAMENT LAB</div><h1>Lock strategies. Run seeds. Inspect behavior.</h1><p>Deterministic evaluation with portable evidence and a shared Three.js live/replay presentation.</p></div>
        <div className={styles.headerActions}><Link href="/submit" className={styles.back}>Submission workspace</Link><Link href="/" className={styles.back}>← Live arena</Link></div>
      </header>

      <section className={styles.pipeline}>{['SUBMISSIONS','LOCK','SEEDED MATCHES','FINGERPRINT','3D REPLAY','ARTIFACT'].map((item,index)=><div key={item} className={styles.pipelineStep}><b>{String(index+1).padStart(2,'0')}</b><span>{item}</span></div>)}</section>

      <section className={styles.submissions}>{sampleControllerSubmissions.map((submission)=><article key={submission.agentId} className={styles.submissionCard}><div className={styles.model}>{submission.model}</div><h3>{submission.strategy.label}</h3><p>{submission.strategy.summary}</p><div className={styles.traits}><span>Agg {Math.round(submission.strategy.aggression*100)}</span><span>Risk {Math.round(submission.strategy.riskTolerance*100)}</span><span>Edge {Math.round(submission.strategy.edgeAvoidance*100)}</span></div></article>)}</section>

      <div className={styles.runRow}>
        <button onClick={run} disabled={running}>{running?'Running…':result?'Run sample tournament':'Run sample tournament'}</button>
        <button onClick={()=>fileInput.current?.click()}>Import artifact</button>
        <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={(event)=>void importArtifact(event.target.files?.[0])}/>
        <span>Imported artifacts are validated and persisted locally in IndexedDB.</span>
      </div>
      {saved.length>0 && <div className={styles.savedRow}><span>RECENT EVIDENCE</span>{saved.slice(0,5).map((entry)=><button key={entry.id} onClick={()=>useArtifact(entry.artifact)}>{new Date(entry.createdAt).toLocaleString()} · {entry.lockHash.slice(0,10)}</button>)}</div>}
      {error&&<div className={styles.error}>{error}</div>}

      {result&&<>
        <section className={styles.resultGrid}>
          <div className={styles.panel}><div className={styles.panelTitle}>BEHAVIOR FINGERPRINT</div><div className={styles.rankings}>{result.tournament.agents.map((agent,index)=><article key={agent.id} className={styles.agentResult}><div className={styles.rank}><b>#{index+1}</b><div><strong>{agent.name}</strong><small>{agent.wins}/{agent.matches} wins · avg rank {agent.averageRank.toFixed(2)}</small></div><em>{Math.round(agent.winRate*100)}%</em></div><div className={styles.fingerprint}>{FINGERPRINT_KEYS.map((key)=><div key={key}><span>{key}</span><i><b style={{width:`${agent.fingerprint[key]*100}%`}}/></i><em>{Math.round(agent.fingerprint[key]*100)}</em></div>)}</div></article>)}</div></div>
          <div className={styles.panel}><div className={styles.panelTitle}>CONTROLLER LOCK</div><div className={styles.lockHash}>{result.lock.lockHash}</div>{result.lock.controllers.map((controller)=><div className={styles.lockRow} key={controller.agentId}><strong>{controller.agentId}</strong><span>{controller.sourceHash.slice(0,18)}…</span></div>)}<div className={styles.exportRow}><button onClick={()=>download('agent-fighting-tournament.json',serializeTournamentArtifact(result.artifact),'application/json')}>Export artifact</button><button onClick={()=>download('agent-fighting-report.md',createTournamentReport(result.artifact),'text/markdown')}>Export report</button><button onClick={()=>void saveTournamentArtifact(result.artifact).then(refreshSaved)}>Save locally</button></div></div>
        </section>

        <section className={styles.replaySection}>
          <div className={styles.replayHeader}><div><div className={styles.panelTitle}>AUTHORITATIVE THREE.JS REPLAY</div><h2>Seed {record?.seed}</h2></div><div className={styles.seedTabs}>{result.records.map((item,index)=><button key={item.seed} className={recordIndex===index?styles.active:''} onClick={()=>{setRecordIndex(index);setTickIndex(0);setReplayPlaying(false)}}>{item.seed}</button>)}</div></div>
          {record&&tick&&replayView&&<div className={styles.replayGrid}>
            <div className={styles.replayArena}>
              <div className={styles.replayViewport}><ThreeArenaViewport view={replayView} selectedFighterId={selectedFighterId} quality="high"/><div className={styles.replayHud}>REPLAY · TICK {tick.tick} · {tick.state.chaos.type.toUpperCase()}</div></div>
              <div className={styles.replayControls}><button onClick={()=>setReplayPlaying((value)=>!value)}>{replayPlaying?'Ⅱ Pause':'▶ Play'}</button>{[0.5,1,2,4].map((speed)=><button key={speed} className={replaySpeed===speed?styles.active:''} onClick={()=>setReplaySpeed(speed)}>{speed}×</button>)}<div className={styles.fighterFocus}><button className={!selectedFighterId?styles.active:''} onClick={()=>setSelectedFighterId(undefined)}>Overview</button>{tick.state.fighters.map((fighter)=><button key={fighter.id} className={selectedFighterId===fighter.id?styles.active:''} onClick={()=>setSelectedFighterId(fighter.id)}>{fighter.name}</button>)}</div></div>
              <input type="range" min={0} max={Math.max(0,record.ticks.length-1)} value={safeTickIndex} onChange={(event)=>{setTickIndex(Number(event.target.value));setReplayPlaying(false)}}/><div className={styles.tickMeta}><span>tick {tick.tick}</span><span>{tick.time.toFixed(2)}s</span><span>{tick.state.chaos.type}</span></div>
            </div>
            <aside className={styles.highlights}><div className={styles.panelTitle}>HIGHLIGHTS</div>{highlights.map((highlight)=><button key={highlight.id} onClick={()=>{const index=record.ticks.findIndex((entry)=>entry.tick>=highlight.tick);setTickIndex(Math.max(0,index));setReplayPlaying(false)}}><time>{highlight.time.toFixed(1)}s</time><span>{highlight.label}</span><b>{highlight.priority}</b></button>)}</aside>
          </div>}
        </section>
      </>}
    </main>
  );
}
