'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, OrbitControls, Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { defaultAgents } from '@/agents/default-agents';
import type { Action, AgentController, ChaosType, FighterSnapshot, FighterStats, MatchEvent, Observation } from './types';

const MATCH_SECONDS = 90;
const START_RADIUS = 9.5;
const OUT_RADIUS = 11.2;

type Runtime = FighterSnapshot & {
  color: string;
  controller: AgentController;
  attackCooldown: number;
  heavyCooldown: number;
  dodgeCooldown: number;
  respawnTimer: number;
  eliminated: boolean;
  stats: FighterStats;
};

type HudFighter = Pick<Runtime, 'id' | 'name' | 'color' | 'damage' | 'stocks' | 'intent' | 'eliminated' | 'stats'>;

function emptyStats(): FighterStats {
  return { attacks: 0, hits: 0, heavyAttacks: 0, dodges: 0, damageDealt: 0, damageTaken: 0, kos: 0, stocksLost: 0 };
}

function createRuntimes(): Runtime[] {
  return defaultAgents.map((agent, index) => {
    const angle = (index / defaultAgents.length) * Math.PI * 2;
    return {
      id: agent.id,
      name: agent.name,
      color: agent.color,
      position: { x: Math.cos(angle) * 4.8, z: Math.sin(angle) * 4.8 },
      velocity: { x: 0, z: 0 },
      damage: 0,
      stocks: 3,
      distanceToEdge: START_RADIUS - 4.8,
      stunned: false,
      intent: 'SPAWN',
      controller: agent.createController(),
      attackCooldown: 0,
      heavyCooldown: 0,
      dodgeCooldown: 0,
      respawnTimer: 0,
      eliminated: false,
      stats: emptyStats(),
    };
  });
}

function Robot({ fighter }: { fighter: Runtime }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.set(fighter.position.x, fighter.respawnTimer > 0 ? -4 : 0.72, fighter.position.z);
    group.current.visible = !fighter.eliminated;
    const speed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
    if (body.current) body.current.rotation.z = Math.sin(state.clock.elapsedTime * 10 + fighter.position.x) * Math.min(0.14, speed * 0.01);
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.58, 0]} ref={body} castShadow>
        <capsuleGeometry args={[0.42, 0.68, 8, 16]} />
        <meshStandardMaterial color={fighter.color} metalness={0.42} roughness={0.28} emissive={fighter.color} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 1.34, 0]} castShadow>
        <sphereGeometry args={[0.39, 24, 24]} />
        <meshStandardMaterial color="#dfe8ff" metalness={0.55} roughness={0.2} />
      </mesh>
      <mesh position={[-0.14, 1.39, 0.35]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={fighter.color} />
      </mesh>
      <mesh position={[0.14, 1.39, 0.35]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshBasicMaterial color={fighter.color} />
      </mesh>
      <Text position={[0, 2.05, 0]} fontSize={0.28} color="#f8fbff" anchorX="center" outlineWidth={0.025} outlineColor="#070a10">
        {fighter.name}
      </Text>
    </group>
  );
}

function ArenaFloor({ radius, chaos }: { radius: number; chaos: ChaosType }) {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius * 1.05, 0.65, 64]} />
        <meshStandardMaterial color={chaos === 'ice' ? '#294969' : '#171e30'} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.12, 0.1, 12, 96]} />
        <meshBasicMaterial color="#7697ff" toneMapped={false} />
      </mesh>
      {[2.8, 5.4, 7.8].map((r) => (
        <mesh key={r} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.018, 6, 80]} />
          <meshBasicMaterial color="#7e91bf" transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
}

function ArenaEngine({ onHud }: { onHud: (payload: { fighters: HudFighter[]; time: number; chaos: ChaosType; radius: number; events: MatchEvent[]; winner?: string }) => void }) {
  const runtimes = useMemo(() => createRuntimes(), []);
  const elapsed = useRef(0);
  const radius = useRef(START_RADIUS);
  const chaos = useRef<ChaosType>('none');
  const chaosUntil = useRef(0);
  const nextChaos = useRef(11);
  const wind = useRef({ x: 0, z: 0 });
  const events = useRef<MatchEvent[]>([]);
  const hudTick = useRef(0);
  const finished = useRef(false);
  const [, forceArenaRender] = useState(0);

  const emit = (event: MatchEvent) => {
    events.current.push(event);
    events.current = events.current.slice(-24);
  };

  const snapshot = (fighter: Runtime): FighterSnapshot => ({
    id: fighter.id,
    name: fighter.name,
    position: { ...fighter.position },
    velocity: { ...fighter.velocity },
    damage: fighter.damage,
    stocks: fighter.stocks,
    distanceToEdge: fighter.distanceToEdge,
    stunned: fighter.stunned,
    intent: fighter.intent,
  });

  const respawn = (fighter: Runtime) => {
    const angle = Math.random() * Math.PI * 2;
    fighter.position.x = Math.cos(angle) * 3.4;
    fighter.position.z = Math.sin(angle) * 3.4;
    fighter.velocity.x = 0;
    fighter.velocity.z = 0;
    fighter.damage *= 0.35;
    fighter.respawnTimer = 0;
    fighter.intent = 'RESPAWN';
    emit({ time: elapsed.current, type: 'respawn', actor: fighter.id, detail: `${fighter.name} respawned` });
  };

  const loseStock = (fighter: Runtime) => {
    if (fighter.respawnTimer > 0 || fighter.eliminated) return;
    fighter.stocks -= 1;
    fighter.stats.stocksLost += 1;
    emit({ time: elapsed.current, type: 'stock-lost', actor: fighter.id, detail: `${fighter.name} lost a stock` });
    if (fighter.stocks <= 0) {
      fighter.eliminated = true;
      emit({ time: elapsed.current, type: 'eliminated', actor: fighter.id, detail: `${fighter.name} eliminated` });
    } else {
      fighter.respawnTimer = 2.2;
    }
  };

  const attack = (attacker: Runtime, heavy: boolean) => {
    if (heavy ? attacker.heavyCooldown > 0 : attacker.attackCooldown > 0) return;
    if (heavy) { attacker.heavyCooldown = 0.92; attacker.stats.heavyAttacks += 1; }
    else attacker.attackCooldown = 0.3;
    attacker.stats.attacks += 1;

    const range = heavy ? 2.45 : 1.85;
    const target = runtimes
      .filter((candidate) => candidate !== attacker && !candidate.eliminated && candidate.respawnTimer <= 0)
      .map((candidate) => ({ candidate, d: Math.hypot(candidate.position.x - attacker.position.x, candidate.position.z - attacker.position.z) }))
      .filter(({ d }) => d < range)
      .sort((a, b) => a.d - b.d)[0]?.candidate;
    if (!target) return;

    const dx = target.position.x - attacker.position.x;
    const dz = target.position.z - attacker.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const damage = heavy ? 15 : 6;
    const knockback = (heavy ? 8.2 : 3.8) * (1 + target.damage / 110);
    target.damage += damage;
    target.velocity.x += (dx / length) * knockback;
    target.velocity.z += (dz / length) * knockback;
    target.stunned = heavy;
    attacker.stats.hits += 1;
    attacker.stats.damageDealt += damage;
    target.stats.damageTaken += damage;
    emit({ time: elapsed.current, type: 'hit', actor: attacker.id, target: target.id, detail: `${attacker.name} ${heavy ? 'heavy-hit' : 'hit'} ${target.name}` });
  };

  const triggerChaos = () => {
    const choices: ChaosType[] = ['ice', 'wind', 'low-gravity', 'shrink'];
    const type = choices[Math.floor(Math.random() * choices.length)];
    chaos.current = type;
    chaosUntil.current = elapsed.current + 9;
    if (type === 'wind') {
      const angle = Math.random() * Math.PI * 2;
      wind.current = { x: Math.cos(angle) * 4.5, z: Math.sin(angle) * 4.5 };
    }
    if (type === 'shrink') radius.current = Math.max(6.4, radius.current - 0.8);
    emit({ time: elapsed.current, type: 'chaos', detail: `Chaos event: ${type}` });
    nextChaos.current = elapsed.current + 14 + Math.random() * 7;
    forceArenaRender((value) => value + 1);
  };

  useFrame((_, rawDt) => {
    if (finished.current) return;
    const dt = Math.min(rawDt, 1 / 30);
    elapsed.current += dt;

    if (elapsed.current > nextChaos.current) triggerChaos();
    if (chaos.current !== 'none' && chaos.current !== 'shrink' && elapsed.current > chaosUntil.current) {
      chaos.current = 'none';
      wind.current = { x: 0, z: 0 };
      forceArenaRender((value) => value + 1);
    }

    for (const fighter of runtimes) {
      fighter.attackCooldown = Math.max(0, fighter.attackCooldown - dt);
      fighter.heavyCooldown = Math.max(0, fighter.heavyCooldown - dt);
      fighter.dodgeCooldown = Math.max(0, fighter.dodgeCooldown - dt);
      fighter.stunned = false;

      if (fighter.eliminated) continue;
      if (fighter.respawnTimer > 0) {
        fighter.respawnTimer -= dt;
        if (fighter.respawnTimer <= 0) respawn(fighter);
        continue;
      }

      fighter.distanceToEdge = radius.current - Math.hypot(fighter.position.x, fighter.position.z);
      const obs: Observation = {
        time: elapsed.current,
        self: snapshot(fighter),
        enemies: runtimes.filter((enemy) => enemy !== fighter && !enemy.eliminated && enemy.respawnTimer <= 0).map(snapshot),
        arena: { radius: radius.current, chaos: chaos.current, wind: { ...wind.current } },
        recentEvents: events.current.slice(-8),
      };
      const action: Action = fighter.controller.act(obs);
      fighter.intent = action.intent;

      const acceleration = chaos.current === 'ice' ? 4.8 : 7.3;
      fighter.velocity.x += action.moveX * acceleration * dt;
      fighter.velocity.z += action.moveZ * acceleration * dt;
      if (chaos.current === 'wind') {
        fighter.velocity.x += wind.current.x * dt;
        fighter.velocity.z += wind.current.z * dt;
      }
      if (action.dodge && fighter.dodgeCooldown <= 0) {
        fighter.velocity.x += action.moveX * 3.4;
        fighter.velocity.z += action.moveZ * 3.4;
        fighter.dodgeCooldown = 1.35;
        fighter.stats.dodges += 1;
      }
      if (action.attack) attack(fighter, false);
      if (action.heavyAttack) attack(fighter, true);

      const damping = chaos.current === 'ice' ? 0.992 : 0.94;
      fighter.velocity.x *= Math.pow(damping, dt * 60);
      fighter.velocity.z *= Math.pow(damping, dt * 60);
      const speed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
      const maxSpeed = 6.6;
      if (speed > maxSpeed) {
        fighter.velocity.x *= maxSpeed / speed;
        fighter.velocity.z *= maxSpeed / speed;
      }
      fighter.position.x += fighter.velocity.x * dt;
      fighter.position.z += fighter.velocity.z * dt;

      if (Math.hypot(fighter.position.x, fighter.position.z) > OUT_RADIUS) loseStock(fighter);
    }

    // Lightweight body collisions. Rapier will replace this in the next iteration.
    for (let i = 0; i < runtimes.length; i += 1) {
      for (let j = i + 1; j < runtimes.length; j += 1) {
        const a = runtimes[i];
        const b = runtimes[j];
        if (a.eliminated || b.eliminated || a.respawnTimer > 0 || b.respawnTimer > 0) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0 && d < 0.92) {
          const nx = dx / d;
          const nz = dz / d;
          const push = (0.92 - d) * 0.5;
          a.position.x -= nx * push;
          a.position.z -= nz * push;
          b.position.x += nx * push;
          b.position.z += nz * push;
        }
      }
    }

    const remaining = runtimes.filter((fighter) => !fighter.eliminated);
    const timeLeft = Math.max(0, MATCH_SECONDS - elapsed.current);
    if (remaining.length <= 1 || timeLeft <= 0) {
      finished.current = true;
      const winner = remaining.length === 1 ? remaining[0] : [...remaining].sort((a, b) => (b.stocks * 100 - b.damage) - (a.stocks * 100 - a.damage))[0];
      if (winner) emit({ time: elapsed.current, type: 'win', actor: winner.id, detail: `${winner.name} wins` });
    }

    hudTick.current += dt;
    if (hudTick.current > 0.1 || finished.current) {
      hudTick.current = 0;
      const winEvent = [...events.current].reverse().find((event) => event.type === 'win');
      onHud({
        fighters: runtimes.map(({ id, name, color, damage, stocks, intent, eliminated, stats }) => ({ id, name, color, damage, stocks, intent, eliminated, stats })),
        time: Math.max(0, MATCH_SECONDS - elapsed.current),
        chaos: chaos.current,
        radius: radius.current,
        events: events.current,
        winner: winEvent?.actor ? runtimes.find((fighter) => fighter.id === winEvent.actor)?.name : undefined,
      });
    }
  });

  return (
    <>
      <ArenaFloor radius={radius.current} chaos={chaos.current} />
      {runtimes.map((fighter) => <Robot key={fighter.id} fighter={fighter} />)}
    </>
  );
}

export function ArenaExperience() {
  const [hud, setHud] = useState<{ fighters: HudFighter[]; time: number; chaos: ChaosType; radius: number; events: MatchEvent[]; winner?: string }>({
    fighters: [], time: MATCH_SECONDS, chaos: 'none', radius: START_RADIUS, events: [],
  });

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#070a12] text-white">
      <Canvas shadows camera={{ position: [12, 15, 16], fov: 42 }} dpr={[1, 1.7]}>
        <color attach="background" args={['#070a12']} />
        <fog attach="fog" args={['#070a12', 18, 38]} />
        <ambientLight intensity={0.7} />
        <directionalLight castShadow position={[8, 14, 7]} intensity={2.1} shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-9, 5, -7]} intensity={42} color="#536dff" distance={20} />
        <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.08}>
          <ArenaEngine onHud={setHud} />
        </Float>
        <Environment preset="city" />
        <OrbitControls makeDefault target={[0, 0.5, 0]} minDistance={13} maxDistance={28} maxPolarAngle={Math.PI / 2.25} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-6 p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Agent Fighting</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">AI Physics Brawl</h1>
          <p className="mt-1 text-sm text-slate-400">One controller. Three stocks. No mid-match edits.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-3 text-right backdrop-blur-xl">
          <div className="font-mono text-2xl tabular-nums">{hud.time.toFixed(1)}s</div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{hud.chaos === 'none' ? 'Arena stable' : `Chaos · ${hud.chaos}`}</div>
        </div>
      </div>

      {hud.winner && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-[2px]">
          <div className="rounded-3xl border border-white/15 bg-[#0d1220]/90 px-12 py-8 text-center shadow-2xl">
            <div className="text-xs uppercase tracking-[0.3em] text-amber-300">Winner</div>
            <div className="mt-2 text-5xl font-black tracking-tight">{hud.winner}</div>
          </div>
        </div>
      )}

      <aside className="absolute bottom-5 right-5 top-28 w-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e18]/80 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live fighters</div>
        <div className="space-y-2 overflow-auto p-3">
          {hud.fighters.map((fighter) => (
            <div key={fighter.id} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold" style={{ color: fighter.color }}>{fighter.name}</div>
                <div className="font-mono text-xs text-slate-400">{Math.round(fighter.damage)}% · {'●'.repeat(Math.max(0, fighter.stocks))}</div>
              </div>
              <div className="mt-1 truncate text-xs text-slate-300">{fighter.eliminated ? 'ELIMINATED' : fighter.intent}</div>
              <div className="mt-2 text-[11px] text-slate-500">hits {fighter.stats.hits} · dmg {Math.round(fighter.stats.damageDealt)} · KOs {fighter.stats.kos}</div>
            </div>
          ))}
        </div>
      </aside>

      <div className="absolute bottom-5 left-5 w-[360px] rounded-3xl border border-white/10 bg-[#0a0e18]/75 p-4 backdrop-blur-xl">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Combat feed</div>
        <div className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-400">
          {hud.events.slice(-6).reverse().map((event, index) => <div key={`${event.time}-${index}`}>{event.time.toFixed(1)} · {event.detail}</div>)}
          {!hud.events.length && <div>Waiting for first contact…</div>}
        </div>
      </div>
    </main>
  );
}
