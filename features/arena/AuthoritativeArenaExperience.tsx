'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { headlessDefaultAgents } from '@/agents/headless-default-agents';
import { createArenaViewModel, createMatchSession } from '@/features/renderers/types';
import type { ArenaViewModel } from '@/features/renderers/types';
import ThreeArenaViewport from './ThreeArenaViewport';
import styles from './AuthoritativeArenaExperience.module.css';

const TICK_MS = 1000 / 30;
const MAX_EVENTS = 6;
const MATCH_SECONDS = 90;

function formatEvent(event: ArenaViewModel['events'][number]) {
  const actor = event.actor ?? 'arena';
  const target = event.target ? ` → ${event.target}` : '';
  return `${actor}${target} · ${event.type.replaceAll('-', ' ')}`;
}

function fighterStatus(fighter: ArenaViewModel['fighters'][number]) {
  if (fighter.eliminated) return 'ELIMINATED';
  if (fighter.respawning) return 'RESPAWNING';
  return fighter.intent || 'OBSERVE';
}

export default function AuthoritativeArenaExperience() {
  const session = useMemo(() => createMatchSession(headlessDefaultAgents), []);
  const [view, setView] = useState<ArenaViewModel>(() => createArenaViewModel(session.getState()));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
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

  const restart = () => window.location.reload();
  const progress = Math.max(0, Math.min(1, 1 - view.timeLeft / MATCH_SECONDS));
  const leader = [...view.fighters].sort((a, b) => b.stocks - a.stocks || a.damage - b.damage)[0];
  const latestEvent = view.events[view.events.length - 1];

  return (
    <main className={styles.shell}>
      <div className={styles.backgroundGrid} />
      <div className={styles.ambientTop} />
      <div className={styles.ambientBottom} />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>AF</span>
          <div>
            <strong>AGENT FIGHTING</strong>
            <small>AUTONOMOUS COMBAT LAB</small>
          </div>
        </div>
        <div className={styles.liveState}>
          <i />
          <span>{view.winnerId ? 'MATCH COMPLETE' : playing ? 'LIVE SIMULATION' : 'PAUSED'}</span>
          <b>SEED 9703</b>
        </div>
        <div className={styles.controls}>
          <button className={styles.primaryControl} onClick={() => setPlaying((value) => !value)}>{playing ? 'Ⅱ PAUSE' : '▶ RESUME'}</button>
          <div className={styles.speedGroup}>
            {[1, 2, 4].map((value) => (
              <button key={value} className={speed === value ? styles.active : ''} onClick={() => setSpeed(value)}>{value}×</button>
            ))}
          </div>
          <button onClick={restart}>↻ RESET</button>
        </div>
      </header>

      <section className={styles.matchHeader}>
        <div>
          <div className={styles.kicker}>ROUND 01 / AUTHORITATIVE ARENA</div>
          <h1>Locked strategies. Shared world. <span>Only behavior wins.</span></h1>
        </div>
        <div className={styles.timerBlock}>
          <small>TIME REMAINING</small>
          <strong>{Math.max(0, view.timeLeft).toFixed(1)}</strong>
          <span>SECONDS</span>
        </div>
      </section>

      <section className={styles.combatLayout}>
        <aside className={styles.leftRail}>
          <div className={styles.railLabel}>CONTENDERS</div>
          {view.fighters.map((fighter, index) => (
            <article key={fighter.id} className={`${styles.fighterCard} ${fighter.eliminated ? styles.eliminated : ''}`}>
              <div className={styles.fighterCardTop}>
                <span className={styles.agentIndex}>0{index + 1}</span>
                <span className={styles.colorDot} style={{ background: fighter.color, boxShadow: `0 0 22px ${fighter.color}` }} />
                <div className={styles.fighterIdentity}>
                  <strong>{fighter.name}</strong>
                  <small>{fighter.id}</small>
                </div>
              </div>
              <div className={styles.damageRow}>
                <strong>{Math.round(fighter.damage)}<small>%</small></strong>
                <div className={styles.stockPips}>
                  {Array.from({ length: 3 }).map((_, stockIndex) => (
                    <i key={stockIndex} className={stockIndex < fighter.stocks ? styles.stockAlive : ''} />
                  ))}
                </div>
              </div>
              <div className={styles.intentRow}>
                <span>INTENT</span>
                <b>{fighterStatus(fighter)}</b>
              </div>
              <div className={styles.telemetry}>
                <span>VX {fighter.velocityX.toFixed(1)}</span>
                <span>VZ {fighter.velocityZ.toFixed(1)}</span>
                <span>{fighter.weapon ? fighter.weapon.toUpperCase() : 'UNARMED'}</span>
              </div>
            </article>
          ))}

          <div className={styles.signalCard}>
            <div className={styles.railLabel}>MATCH SIGNAL</div>
            <div className={styles.signalGrid}>
              <span><small>TICK</small><b>{view.tick}</b></span>
              <span><small>RADIUS</small><b>{view.radius.toFixed(1)}m</b></span>
              <span><small>CHAOS</small><b>{view.chaos.toUpperCase()}</b></span>
              <span><small>EDGE</small><b>{leader?.name ?? '—'}</b></span>
            </div>
          </div>
        </aside>

        <section className={styles.stageShell}>
          <div className={styles.stageChromeTop}>
            <span><i /> AUTHORITATIVE WORLD STATE</span>
            <b>{view.chaos === 'none' ? 'ARENA STABLE' : `${view.chaos.toUpperCase()} EVENT ACTIVE`}</b>
          </div>
          <div className={styles.viewport}>
            <ThreeArenaViewport view={view} />
            <div className={styles.vignette} />
            <div className={styles.scanlines} />
            <div className={styles.cornerTL} /><div className={styles.cornerTR} />
            <div className={styles.cornerBL} /><div className={styles.cornerBR} />

            <div className={styles.arenaBadge}>
              <small>COMBAT ZONE</small>
              <strong>THE FORGE</strong>
              <span>RADIUS {view.radius.toFixed(1)}M</span>
            </div>

            {latestEvent && (
              <div className={styles.actionBanner} key={latestEvent.id}>
                <small>LIVE EVENT #{latestEvent.id}</small>
                <strong>{formatEvent(latestEvent)}</strong>
              </div>
            )}

            {view.winnerId && (
              <div className={styles.winnerOverlay}>
                <small>SIMULATION COMPLETE</small>
                <strong>{view.fighters.find((fighter) => fighter.id === view.winnerId)?.name ?? view.winnerId}</strong>
                <span>VICTORIOUS AGENT</span>
                <button onClick={restart}>RUN REMATCH</button>
              </div>
            )}
          </div>
          <div className={styles.progressTrack}><i style={{ width: `${progress * 100}%` }} /></div>
          <div className={styles.stageFooter}>
            <span>01 · SAME SNAPSHOT</span>
            <span>02 · COLLECT ACTIONS</span>
            <span>03 · RESOLVE TOGETHER</span>
            <b>RENDERER: THREE.JS</b>
          </div>
        </section>

        <aside className={styles.rightRail}>
          <div className={styles.eventPanel}>
            <div className={styles.panelHeading}>
              <div>
                <div className={styles.railLabel}>EVENT STREAM</div>
                <strong>Combat telemetry</strong>
              </div>
              <span>{view.events.length}</span>
            </div>
            <div className={styles.events}>
              {view.events.slice(-MAX_EVENTS).reverse().map((event, index) => (
                <div key={event.id} className={`${styles.event} ${index === 0 ? styles.latest : ''}`}>
                  <div className={styles.eventLine} />
                  <time>#{String(event.id).padStart(3, '0')}</time>
                  <div>
                    <b>{event.type.replaceAll('-', ' ').toUpperCase()}</b>
                    <span>{event.actor ?? 'arena'}{event.target ? ` → ${event.target}` : ''}</span>
                    <small>{event.detail}</small>
                  </div>
                </div>
              ))}
              {!view.events.length && <div className={styles.empty}>Waiting for first contact…</div>}
            </div>
          </div>

          <div className={styles.rulePanel}>
            <div className={styles.railLabel}>EVALUATION CONTRACT</div>
            <p><i /> Controller source stays locked once combat starts.</p>
            <p><i /> Every agent receives the same authoritative snapshot.</p>
            <p><i /> Rendering interpolates state but owns zero combat rules.</p>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>AGENT FIGHTING / BEHAVIOR-FIRST EVALUATION</span>
        <span>SEEDED · DETERMINISTIC · REPLAYABLE</span>
        <span>ENGINE 30HZ / VISUAL 60FPS</span>
      </footer>
    </main>
  );
}
