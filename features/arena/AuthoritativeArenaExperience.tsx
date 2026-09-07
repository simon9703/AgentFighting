'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { headlessDefaultAgents } from '@/agents/headless-default-agents';
import { createArenaViewModel, createMatchSession } from '@/features/renderers/types';
import type { ArenaViewModel } from '@/features/renderers/types';
import styles from './AuthoritativeArenaExperience.module.css';

const TICK_MS = 1000 / 30;
const MAX_EVENTS = 7;

const initialView = (): ArenaViewModel =>
  createArenaViewModel(createMatchSession(headlessDefaultAgents).getState());

function formatEvent(event: ArenaViewModel['events'][number]) {
  const actor = event.actor ?? 'arena';
  const target = event.target ? ` → ${event.target}` : '';
  return `${actor}${target} · ${event.type.replaceAll('-', ' ')}`;
}

export default function AuthoritativeArenaExperience() {
  const session = useMemo(() => createMatchSession(headlessDefaultAgents), []);
  const [view, setView] = useState<ArenaViewModel>(() => createArenaViewModel(session.getState()));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [generation, setGeneration] = useState(0);
  const accumulator = useRef(0);
  const lastFrame = useRef<number | null>(null);

  useEffect(() => session.subscribe((state) => setView(createArenaViewModel(state))), [session]);

  useEffect(() => {
    if (!playing || view.winnerId) return;
    let frame = 0;
    const loop = (now: number) => {
      const previous = lastFrame.current ?? now;
      lastFrame.current = now;
      accumulator.current += Math.min(100, now - previous) * speed;
      while (accumulator.current >= TICK_MS && !session.getSummary()) {
        session.step();
        accumulator.current -= TICK_MS;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lastFrame.current = null;
    };
  }, [playing, session, speed, view.winnerId]);

  const restart = () => {
    window.location.reload();
  };

  const radius = Math.max(1, view.radius);
  const progress = Math.max(0, Math.min(1, 1 - view.timeLeft / 90));
  const leader = [...view.fighters].sort((a, b) => b.stocks - a.stocks || a.damage - b.damage)[0];

  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} />
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>AGENT FIGHTING / LIVE EVALUATION</div>
          <h1>Autonomous agents. One locked strategy. One chaotic arena.</h1>
          <p>Every fighter is driven by fixed controller code against the same authoritative world state.</p>
        </div>
        <div className={styles.controls}>
          <button onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Resume'}</button>
          {[1, 2, 4].map((value) => (
            <button key={value} className={speed === value ? styles.active : ''} onClick={() => setSpeed(value)}>{value}×</button>
          ))}
          <button onClick={restart}>New seed</button>
        </div>
      </header>

      <section className={styles.scoreStrip}>
        {view.fighters.map((fighter) => (
          <article key={fighter.id} className={`${styles.scoreCard} ${fighter.eliminated ? styles.eliminated : ''}`}>
            <div className={styles.identity}><span style={{ background: fighter.color }} /><strong>{fighter.name}</strong></div>
            <div className={styles.stockRow}><b>{fighter.stocks}</b><span>stocks</span><b>{Math.round(fighter.damage)}%</b></div>
            <div className={styles.intent}>{fighter.intent || 'OBSERVE'}</div>
          </article>
        ))}
      </section>

      <section className={styles.stageGrid}>
        <aside className={styles.panel}>
          <div className={styles.panelTitle}>MATCH SIGNAL</div>
          <div className={styles.metric}><span>Tick</span><strong>{view.tick}</strong></div>
          <div className={styles.metric}><span>Time left</span><strong>{view.timeLeft.toFixed(1)}s</strong></div>
          <div className={styles.metric}><span>Arena</span><strong>{view.radius.toFixed(1)}m</strong></div>
          <div className={styles.metric}><span>Chaos</span><strong>{view.chaos.toUpperCase()}</strong></div>
          <div className={styles.progress}><i style={{ width: `${progress * 100}%` }} /></div>
          <div className={styles.leader}>Current edge<br /><strong>{leader?.name ?? '—'}</strong></div>
        </aside>

        <div className={styles.arenaFrame}>
          <div className={styles.arenaGlow} />
          <div className={styles.arena} data-chaos={view.chaos}>
            <div className={styles.ring} />
            <div className={styles.innerRing} />
            <div className={styles.crossX} /><div className={styles.crossZ} />
            {view.fighters.map((fighter) => {
              const left = 50 + (fighter.x / radius) * 42;
              const top = 50 + (fighter.z / radius) * 42;
              const speedValue = Math.hypot(fighter.velocityX, fighter.velocityZ);
              return (
                <div
                  key={fighter.id}
                  className={`${styles.fighter} ${fighter.respawning ? styles.respawning : ''} ${fighter.eliminated ? styles.eliminatedFighter : ''}`}
                  style={{ left: `${left}%`, top: `${top}%`, '--agent-color': fighter.color } as React.CSSProperties}
                >
                  <div className={styles.fighterShadow} />
                  <div className={styles.bot} style={{ transform: `rotate(${Math.atan2(fighter.velocityZ, fighter.velocityX)}rad) scale(${1 + Math.min(.1, speedValue * .02)})` }}>
                    <div className={styles.botCore} /><div className={styles.botEye} />
                  </div>
                  <div className={styles.nameplate}><strong>{fighter.name}</strong><span>{Math.round(fighter.damage)}% · {fighter.stocks} stock</span></div>
                  {fighter.weapon && <div className={styles.weapon}>{fighter.weapon}</div>}
                </div>
              );
            })}
            <div className={styles.centerMark}>AF</div>
          </div>
          <div className={styles.arenaCaption}><span>AUTHORITATIVE WORLD STATE</span><b>{view.winnerId ? `${view.winnerId.toUpperCase()} WINS` : 'SIMULATION LIVE'}</b></div>
        </div>

        <aside className={styles.panel}>
          <div className={styles.panelTitle}>EVENT FEED</div>
          <div className={styles.events}>
            {view.events.slice(-MAX_EVENTS).reverse().map((event) => (
              <div key={event.id} className={styles.event}><time>#{event.id}</time><span>{formatEvent(event)}</span></div>
            ))}
            {!view.events.length && <div className={styles.empty}>Waiting for first contact…</div>}
          </div>
          <div className={styles.legend}><i /> same snapshot → collect actions → resolve together</div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>Controller code stays locked during the match.</span>
        <span>Renderer owns zero combat rules.</span>
        <span>Seeded engine · replayable state · behavior-first evaluation.</span>
      </footer>
    </main>
  );
}
