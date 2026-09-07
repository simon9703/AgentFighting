'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { sampleControllerSubmissions } from '@/agents/sample-submissions';
import { evaluateControllerSubmissions, serializeTournamentArtifact, createTournamentReport, type SubmissionTournamentResult } from '@/features/evaluation';
import { createHighlightTimeline } from '@/features/replay';
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

export default function TournamentLab() {
  const [result, setResult] = useState<SubmissionTournamentResult | null>(null);
  const [running, setRunning] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const [tickIndex, setTickIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setRunning(true);
    setError(null);
    try {
      const next = evaluateControllerSubmissions({
        submissions: sampleControllerSubmissions,
        seeds: [11, 23, 37, 51, 79],
        engineVersion: '0.1.0',
      });
      setResult(next);
      setRecordIndex(0);
      setTickIndex(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  };

  const record = result?.records[recordIndex];
  const tick = record?.ticks[Math.min(tickIndex, Math.max(0, (record?.ticks.length ?? 1) - 1))];
  const highlights = useMemo(() => record ? createHighlightTimeline(record, 18) : [], [record]);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>AGENT FIGHTING / TOURNAMENT LAB</div>
          <h1>Lock strategies. Run seeds. Inspect behavior.</h1>
          <p>The lab evaluates fixed controller code across reproducible matches and turns raw outcomes into replayable evidence.</p>
        </div>
        <Link href="/" className={styles.back}>← Live arena</Link>
      </header>

      <section className={styles.pipeline}>
        {['SUBMISSIONS', 'LOCK', '5 SEEDED MATCHES', 'FINGERPRINT', 'REPLAY', 'EXPORT'].map((item, index) => (
          <div key={item} className={styles.pipelineStep}><b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span></div>
        ))}
      </section>

      <section className={styles.submissions}>
        {sampleControllerSubmissions.map((submission) => (
          <article key={submission.agentId} className={styles.submissionCard}>
            <div className={styles.model}>{submission.model}</div>
            <h3>{submission.strategy.label}</h3>
            <p>{submission.strategy.summary}</p>
            <div className={styles.traits}><span>Agg {Math.round(submission.strategy.aggression * 100)}</span><span>Risk {Math.round(submission.strategy.riskTolerance * 100)}</span><span>Edge {Math.round(submission.strategy.edgeAvoidance * 100)}</span></div>
          </article>
        ))}
      </section>

      <div className={styles.runRow}>
        <button onClick={run} disabled={running}>{running ? 'Running…' : result ? 'Run again' : 'Run tournament'}</button>
        <span>Controllers are compiled once, source-hashed and locked before the first seed starts.</span>
      </div>
      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <>
          <section className={styles.resultGrid}>
            <div className={styles.panel}>
              <div className={styles.panelTitle}>BEHAVIOR FINGERPRINT</div>
              <div className={styles.rankings}>
                {result.tournament.agents.map((agent, index) => (
                  <article key={agent.id} className={styles.agentResult}>
                    <div className={styles.rank}><b>#{index + 1}</b><div><strong>{agent.name}</strong><small>{agent.wins}/{agent.matches} wins · avg rank {agent.averageRank.toFixed(2)}</small></div><em>{Math.round(agent.winRate * 100)}%</em></div>
                    <div className={styles.fingerprint}>
                      {FINGERPRINT_KEYS.map((key) => <div key={key}><span>{key}</span><i><b style={{ width: `${agent.fingerprint[key] * 100}%` }} /></i><em>{Math.round(agent.fingerprint[key] * 100)}</em></div>)}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelTitle}>CONTROLLER LOCK</div>
              <div className={styles.lockHash}>{result.lock.lockHash}</div>
              {result.lock.controllers.map((controller) => (
                <div className={styles.lockRow} key={controller.agentId}><strong>{controller.agentId}</strong><span>{controller.sourceHash.slice(0, 18)}…</span></div>
              ))}
              <div className={styles.exportRow}>
                <button onClick={() => download('agent-fighting-tournament.json', serializeTournamentArtifact(result.artifact), 'application/json')}>Export artifact</button>
                <button onClick={() => download('agent-fighting-report.md', createTournamentReport(result.artifact), 'text/markdown')}>Export report</button>
              </div>
            </div>
          </section>

          <section className={styles.replaySection}>
            <div className={styles.replayHeader}>
              <div><div className={styles.panelTitle}>AUTHORITATIVE REPLAY INSPECTOR</div><h2>Seed {record?.seed}</h2></div>
              <div className={styles.seedTabs}>{result.records.map((item, index) => <button key={item.seed} className={recordIndex === index ? styles.active : ''} onClick={() => { setRecordIndex(index); setTickIndex(0); }}>{item.seed}</button>)}</div>
            </div>

            {record && tick && (
              <div className={styles.replayGrid}>
                <div className={styles.replayArena}>
                  <div className={styles.arenaCircle}>
                    {tick.state.fighters.map((fighter) => {
                      const radius = Math.max(1, tick.state.arenaRadius);
                      return <div key={fighter.id} className={styles.dot} style={{ left: `${50 + fighter.position.x / radius * 43}%`, top: `${50 + fighter.position.z / radius * 43}%`, background: fighter.color, opacity: fighter.eliminated ? .15 : 1 }}><span>{fighter.name}</span></div>;
                    })}
                    <div className={styles.center}>AF</div>
                  </div>
                  <input type="range" min={0} max={Math.max(0, record.ticks.length - 1)} value={Math.min(tickIndex, record.ticks.length - 1)} onChange={(event) => setTickIndex(Number(event.target.value))} />
                  <div className={styles.tickMeta}><span>tick {tick.tick}</span><span>{tick.time.toFixed(2)}s</span><span>{tick.state.chaos.type}</span></div>
                </div>

                <aside className={styles.highlights}>
                  <div className={styles.panelTitle}>HIGHLIGHTS</div>
                  {highlights.map((highlight) => <button key={highlight.id} onClick={() => { const index = record.ticks.findIndex((entry) => entry.tick >= highlight.tick); setTickIndex(Math.max(0, index)); }}><time>{highlight.time.toFixed(1)}s</time><span>{highlight.label}</span><b>{highlight.priority}</b></button>)}
                </aside>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
