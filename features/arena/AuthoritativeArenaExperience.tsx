'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { headlessDefaultAgents } from '@/agents/headless-default-agents';
import { createArenaViewModel, createMatchSession } from '@/features/renderers/types';
import type { ArenaViewModel } from '@/features/renderers/types';
import AdaptiveThreeArenaViewport from './AdaptiveThreeArenaViewport';
import { ArenaAudio } from './ArenaAudio';
import styles from './AuthoritativeArenaExperience.module.css';

const TICK_MS = 1000 / 30;
const MATCH_SECONDS = 90;

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
  const [selectedFighterId, setSelectedFighterId] = useState<string>();
  const [audioEnabled, setAudioEnabled] = useState(false);
  const accumulator = useRef(0);
  const lastFrame = useRef<number | null>(null);
  const audioRef = useRef<ArenaAudio | null>(null);
  const lastAudioEventId = useRef(-1);

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
    return () => { cancelAnimationFrame(frame); lastFrame.current = null; };
  }, [playing, session, speed, view.winnerId]);

  useEffect(() => {
    if (!audioEnabled) return;
    const latest = view.events[view.events.length - 1];
    if (!latest || latest.id === lastAudioEventId.current) return;
    lastAudioEventId.current = latest.id;
    audioRef.current?.play(latest);
  }, [audioEnabled, view.events]);

  useEffect(() => () => audioRef.current?.dispose(), []);

  const toggleAudio = async () => {
    if (audioEnabled) return setAudioEnabled(false);
    const audio = audioRef.current ?? new ArenaAudio();
    audioRef.current = audio;
    await audio.enable();
    setAudioEnabled(true);
  };

  const restart = () => window.location.reload();
  const progress = Math.max(0, Math.min(1, 1 - view.timeLeft / MATCH_SECONDS));
  const latestEvent = view.events[view.events.length - 1];
  const focused = view.fighters.find((fighter) => fighter.id === selectedFighterId);

  return (
    <main className={styles.shell}>
      <div className={styles.worldLayer}>
        <AdaptiveThreeArenaViewport view={view} selectedFighterId={selectedFighterId} />
      </div>
      <div className={styles.worldVignette} />
      <div className={styles.worldScan} />

      <header className={styles.topHud}>
        <div className={styles.brand}>
          <span>AF</span>
          <div><strong>AGENT FIGHTING</strong><small>AUTONOMOUS COMBAT LAB</small></div>
        </div>
        <div className={styles.matchState}><i /><b>{view.winnerId ? 'MATCH COMPLETE' : playing ? 'LIVE' : 'PAUSED'}</b><span>SEED 9703</span></div>
        <nav className={styles.nav}><Link href="/submit">SUBMIT</Link><Link href="/tournament">TOURNAMENT</Link></nav>
        <div className={styles.controls}>
          <button onClick={() => setPlaying((v) => !v)}>{playing ? 'Ⅱ' : '▶'}</button>
          {[1,2,4].map((v)=><button key={v} className={speed===v?styles.active:''} onClick={()=>setSpeed(v)}>{v}×</button>)}
          <button onClick={()=>setSelectedFighterId(undefined)}>◎</button>
          <button onClick={()=>void toggleAudio()}>{audioEnabled?'🔊':'🔇'}</button>
          <button onClick={restart}>↻</button>
        </div>
      </header>

      <section className={styles.centerHud}>
        <div className={styles.round}>ROUND 01 · THE FORGE</div>
        <div className={styles.timer}><strong>{Math.max(0, view.timeLeft).toFixed(1)}</strong><span>SEC</span></div>
        <div className={styles.subline}>{focused ? `FOLLOWING ${focused.name.toUpperCase()}` : view.chaos === 'none' ? 'AUTO DIRECTOR' : `${view.chaos.toUpperCase()} CHAOS`}</div>
      </section>

      <aside className={styles.leftHud}>
        {view.fighters.map((fighter,index)=><button key={fighter.id} className={`${styles.fighterCard} ${fighter.eliminated?styles.eliminated:''} ${selectedFighterId===fighter.id?styles.selected:''}`} onClick={()=>setSelectedFighterId((current)=>current===fighter.id?undefined:fighter.id)}>
          <div className={styles.fighterTop}><span className={styles.index}>0{index+1}</span><i style={{background:fighter.color,boxShadow:`0 0 18px ${fighter.color}`}}/><strong>{fighter.name}</strong><em>{Math.round(fighter.damage)}%</em></div>
          <div className={styles.fighterMeta}><span>{fighterStatus(fighter)}</span><b>{fighter.weapon?fighter.weapon.toUpperCase():'UNARMED'}</b></div>
          <div className={styles.stocks}>{Array.from({length:3}).map((_,i)=><i key={i} className={i<fighter.stocks?styles.alive:''}/>)}</div>
        </button>)}
      </aside>

      <aside className={styles.rightHud}>
        <div className={styles.eventHeader}><span>EVENT STREAM</span><b>{view.events.length}</b></div>
        {view.events.slice(-5).reverse().map((event,index)=><div key={event.id} className={`${styles.event} ${index===0?styles.latest:''}`}>
          <time>#{String(event.id).padStart(3,'0')}</time>
          <div><strong>{event.type.replaceAll('-',' ').toUpperCase()}</strong><span>{event.actor??'arena'}{event.target?` → ${event.target}`:''}</span></div>
        </div>)}
      </aside>

      <div className={styles.bottomHud}>
        <div className={styles.signal}><span>TICK <b>{view.tick}</b></span><span>RADIUS <b>{view.radius.toFixed(1)}M</b></span><span>CHAOS <b>{view.chaos.toUpperCase()}</b></span></div>
        <div className={styles.progress}><i style={{width:`${progress*100}%`}} /></div>
        <div className={styles.pipeline}><span>SAME SNAPSHOT</span><span>COLLECT ACTIONS</span><span>RESOLVE TOGETHER</span><b>THREE.JS · POST FX · CAMERA DIRECTOR</b></div>
      </div>

      {latestEvent && <div key={latestEvent.id} className={styles.eventFlash}><small>LIVE EVENT</small><strong>{latestEvent.detail}</strong></div>}

      {view.winnerId && <div className={styles.winner}><small>SIMULATION COMPLETE</small><strong>{view.fighters.find((fighter)=>fighter.id===view.winnerId)?.name??view.winnerId}</strong><span>VICTORIOUS AGENT</span><button onClick={restart}>RUN REMATCH</button></div>}
    </main>
  );
}
