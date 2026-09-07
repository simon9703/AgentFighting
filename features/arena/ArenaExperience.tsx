'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { defaultAgents } from '@/agents/default-agents';
import type {
  Action,
  AgentController,
  ChaosType,
  FighterSnapshot,
  FighterStats,
  MatchEvent,
  Observation,
  WeaponSnapshot,
  WeaponType,
} from './types';

const MATCH_SECONDS = 90;
const START_RADIUS = 9.5;
const OUT_MARGIN = 1.6;
const WEAPON_TYPES: WeaponType[] = ['hammer', 'shield', 'push-gun', 'bomb'];

type Runtime = FighterSnapshot & {
  color: string;
  controller: AgentController;
  attackCooldown: number;
  heavyCooldown: number;
  dodgeCooldown: number;
  respawnTimer: number;
  eliminated: boolean;
  hitFlash: number;
  attackFlash: number;
  shieldTimer: number;
  stats: FighterStats;
};

type WeaponRuntime = {
  id: string;
  type: WeaponType;
  x: number;
  z: number;
  available: boolean;
  respawnAt: number;
};

type ImpactFx = {
  id: number;
  x: number;
  z: number;
  bornAt: number;
  color: string;
  heavy: boolean;
};

type HudFighter = Pick<Runtime, 'id' | 'name' | 'color' | 'damage' | 'stocks' | 'intent' | 'eliminated' | 'stats' | 'weapon'>;

type HudPayload = {
  fighters: HudFighter[];
  time: number;
  chaos: ChaosType;
  radius: number;
  events: MatchEvent[];
  winner?: string;
};

function emptyStats(): FighterStats {
  return {
    attacks: 0,
    hits: 0,
    heavyAttacks: 0,
    dodges: 0,
    damageDealt: 0,
    damageTaken: 0,
    kos: 0,
    stocksLost: 0,
    weaponsPicked: 0,
    weaponsUsed: 0,
  };
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
      weapon: undefined,
      controller: agent.createController(),
      attackCooldown: 0,
      heavyCooldown: 0,
      dodgeCooldown: 0,
      respawnTimer: 0,
      eliminated: false,
      hitFlash: 0,
      attackFlash: 0,
      shieldTimer: 0,
      stats: emptyStats(),
    };
  });
}

function createWeapons(): WeaponRuntime[] {
  return WEAPON_TYPES.map((type, index) => {
    const angle = index / WEAPON_TYPES.length * Math.PI * 2 + Math.PI / 4;
    return { id: `weapon-${index}`, type, x: Math.cos(angle) * 6.1, z: Math.sin(angle) * 6.1, available: true, respawnAt: 0 };
  });
}

function Robot({ fighter }: { fighter: Runtime }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const fist = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current) return;
    const speed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
    group.current.position.set(fighter.position.x, fighter.respawnTimer > 0 ? -4 : 0.72, fighter.position.z);
    group.current.visible = !fighter.eliminated;
    group.current.rotation.y = speed > 0.05 ? Math.atan2(fighter.velocity.x, fighter.velocity.z) : group.current.rotation.y;
    if (body.current) {
      body.current.rotation.z = Math.sin(state.clock.elapsedTime * 10 + fighter.position.x) * Math.min(0.14, speed * 0.01);
      const hitScale = fighter.hitFlash > 0 ? 1.12 : 1;
      body.current.scale.setScalar(hitScale);
    }
    if (fist.current) {
      fist.current.position.z = fighter.attackFlash > 0 ? 0.72 : 0.34;
      fist.current.scale.setScalar(fighter.attackFlash > 0 ? 1.45 : 1);
    }
  });

  const faceColor = fighter.hitFlash > 0 ? '#ffffff' : fighter.color;

  return (
    <group ref={group}>
      <mesh position={[0, 0.58, 0]} ref={body} castShadow>
        <capsuleGeometry args={[0.42, 0.68, 8, 16]} />
        <meshStandardMaterial color={faceColor} metalness={0.42} roughness={0.28} emissive={fighter.color} emissiveIntensity={fighter.hitFlash > 0 ? 1.2 : 0.12} />
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
      <mesh ref={fist} position={[0.46, 0.72, 0.34]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color={fighter.color} emissive={fighter.color} emissiveIntensity={0.2} />
      </mesh>
      {fighter.shieldTimer > 0 && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.92, 24, 24]} />
          <meshBasicMaterial color="#8fd5ff" transparent opacity={0.16} wireframe />
        </mesh>
      )}
      <Text position={[0, 2.08, 0]} fontSize={0.28} color="#f8fbff" anchorX="center" outlineWidth={0.025} outlineColor="#070a10">
        {fighter.name}
      </Text>
      <Text position={[0, 1.82, 0]} fontSize={0.18} color={fighter.color} anchorX="center" outlineWidth={0.015} outlineColor="#070a10">
        {`${Math.round(fighter.damage)}% · ${fighter.stocks} stock${fighter.weapon ? ` · ${fighter.weapon}` : ''}`}
      </Text>
    </group>
  );
}

function ArenaFloor({ radius, chaos }: { radius: number; chaos: ChaosType }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.32, 0]}>
        <cylinderGeometry args={[radius, radius * 1.05, 0.65, 64]} />
        <meshStandardMaterial color={chaos === 'ice' ? '#294969' : '#171e30'} metalness={0.65} roughness={chaos === 'ice' ? 0.12 : 0.35} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.16, 0.1, 12, 96]} />
        <meshBasicMaterial color={chaos === 'shrink' ? '#ff6b81' : '#7697ff'} toneMapped={false} />
      </mesh>
      {[2.8, 5.4, 7.8].filter((r) => r < radius - 0.2).map((r) => (
        <mesh key={r} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.018, 6, 80]} />
          <meshBasicMaterial color="#7e91bf" transparent opacity={0.18} />
        </mesh>
      ))}
      <Sparkles count={45} scale={[radius * 1.8, 3, radius * 1.8]} size={1.6} speed={0.15} opacity={0.18} color="#9eb1ff" />
    </group>
  );
}

function WeaponPickup({ weapon }: { weapon: WeaponRuntime }) {
  if (!weapon.available) return null;
  const color = weapon.type === 'hammer' ? '#ffb458' : weapon.type === 'shield' ? '#6fd4ff' : weapon.type === 'push-gun' ? '#7dffad' : '#ff6e83';
  return (
    <Float speed={2.1} rotationIntensity={0.5} floatIntensity={0.45}>
      <group position={[weapon.x, 0.72, weapon.z]}>
        <mesh castShadow>
          {weapon.type === 'hammer' ? <boxGeometry args={[0.8, 0.28, 0.32]} /> : weapon.type === 'shield' ? <cylinderGeometry args={[0.42, 0.42, 0.14, 24]} /> : <octahedronGeometry args={[0.36, 0]} />}
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} metalness={0.5} roughness={0.2} />
        </mesh>
        <pointLight color={color} intensity={1.4} distance={3} />
        <Text position={[0, 0.65, 0]} fontSize={0.2} color={color} anchorX="center" outlineWidth={0.015} outlineColor="#06080e">
          {weapon.type.toUpperCase()}
        </Text>
      </group>
    </Float>
  );
}

function Impact({ fx, now }: { fx: ImpactFx; now: number }) {
  const age = now - fx.bornAt;
  const scale = 0.25 + age * (fx.heavy ? 5 : 3.2);
  const opacity = Math.max(0, 1 - age / 0.42);
  return (
    <group position={[fx.x, 0.85, fx.z]} scale={scale}>
      <mesh>
        <ringGeometry args={[0.18, 0.27, 18]} />
        <meshBasicMaterial color={fx.color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {fx.heavy && <pointLight color={fx.color} intensity={opacity * 6} distance={4} />}
    </group>
  );
}

function CameraDirector({ shake }: { shake: React.MutableRefObject<number> }) {
  useFrame((state, dt) => {
    shake.current = Math.max(0, shake.current - dt * 1.8);
    const t = state.clock.elapsedTime;
    const radius = 16.8;
    const base = new THREE.Vector3(Math.sin(t * 0.045) * 3.2, 13.4, radius);
    const amount = shake.current * 0.28;
    base.x += (Math.random() - 0.5) * amount;
    base.y += (Math.random() - 0.5) * amount;
    state.camera.position.lerp(base, 0.035);
    state.camera.lookAt(0, 0.5, 0);
  });
  return null;
}

function ArenaEngine({ onHud }: { onHud: (payload: HudPayload) => void }) {
  const runtimes = useMemo(() => createRuntimes(), []);
  const weapons = useMemo(() => createWeapons(), []);
  const elapsed = useRef(0);
  const radius = useRef(START_RADIUS);
  const chaos = useRef<ChaosType>('none');
  const chaosUntil = useRef(0);
  const nextChaos = useRef(11);
  const wind = useRef({ x: 0, z: 0 });
  const events = useRef<MatchEvent[]>([]);
  const impacts = useRef<ImpactFx[]>([]);
  const impactId = useRef(0);
  const shake = useRef(0);
  const hudTick = useRef(0);
  const finished = useRef(false);
  const [, forceArenaRender] = useState(0);

  const emit = (event: MatchEvent) => {
    events.current.push(event);
    events.current = events.current.slice(-32);
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
    weapon: fighter.weapon,
  });

  const weaponSnapshots = (fighter: Runtime): WeaponSnapshot[] => weapons.map((weapon) => ({
    id: weapon.id,
    type: weapon.type,
    position: { x: weapon.x, z: weapon.z },
    distance: Math.hypot(weapon.x - fighter.position.x, weapon.z - fighter.position.z),
    available: weapon.available,
  }));

  const respawn = (fighter: Runtime) => {
    const angle = Math.random() * Math.PI * 2;
    fighter.position.x = Math.cos(angle) * 3.4;
    fighter.position.z = Math.sin(angle) * 3.4;
    fighter.velocity.x = 0;
    fighter.velocity.z = 0;
    fighter.damage *= 0.35;
    fighter.respawnTimer = 0;
    fighter.intent = 'RESPAWN';
    fighter.weapon = undefined;
    emit({ time: elapsed.current, type: 'respawn', actor: fighter.id, detail: `${fighter.name} respawned` });
  };

  const loseStock = (fighter: Runtime) => {
    if (fighter.respawnTimer > 0 || fighter.eliminated) return;
    fighter.stocks -= 1;
    fighter.stats.stocksLost += 1;
    fighter.weapon = undefined;
    emit({ time: elapsed.current, type: 'stock-lost', actor: fighter.id, detail: `${fighter.name} lost a stock` });
    shake.current = Math.max(shake.current, 0.9);
    if (fighter.stocks <= 0) {
      fighter.eliminated = true;
      emit({ time: elapsed.current, type: 'eliminated', actor: fighter.id, detail: `${fighter.name} eliminated` });
    } else {
      fighter.respawnTimer = 2.2;
    }
  };

  const applyHit = (attacker: Runtime, target: Runtime, damage: number, knockback: number, heavy: boolean, label: string) => {
    const dx = target.position.x - attacker.position.x;
    const dz = target.position.z - attacker.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const shieldScale = target.shieldTimer > 0 ? 0.35 : 1;
    target.damage += damage * shieldScale;
    const kb = knockback * (1 + target.damage / 110) * shieldScale;
    target.velocity.x += (dx / length) * kb;
    target.velocity.z += (dz / length) * kb;
    target.hitFlash = heavy ? 0.18 : 0.1;
    target.stunned = heavy;
    attacker.stats.hits += 1;
    attacker.stats.damageDealt += damage * shieldScale;
    target.stats.damageTaken += damage * shieldScale;
    impacts.current.push({ id: impactId.current++, x: target.position.x, z: target.position.z, bornAt: elapsed.current, color: attacker.color, heavy });
    impacts.current = impacts.current.slice(-18);
    shake.current = Math.max(shake.current, heavy ? 0.72 : 0.28);
    emit({ time: elapsed.current, type: 'hit', actor: attacker.id, target: target.id, detail: `${attacker.name} ${label} ${target.name}` });
  };

  const attack = (attacker: Runtime, heavy: boolean) => {
    if (heavy ? attacker.heavyCooldown > 0 : attacker.attackCooldown > 0) return;
    if (heavy) { attacker.heavyCooldown = 0.92; attacker.stats.heavyAttacks += 1; }
    else attacker.attackCooldown = 0.3;
    attacker.stats.attacks += 1;
    attacker.attackFlash = heavy ? 0.2 : 0.11;

    const range = heavy ? 2.45 : 1.85;
    const target = runtimes
      .filter((candidate) => candidate !== attacker && !candidate.eliminated && candidate.respawnTimer <= 0)
      .map((candidate) => ({ candidate, d: Math.hypot(candidate.position.x - attacker.position.x, candidate.position.z - attacker.position.z) }))
      .filter(({ d }) => d < range)
      .sort((a, b) => a.d - b.d)[0]?.candidate;
    if (!target) return;
    applyHit(attacker, target, heavy ? 15 : 6, heavy ? 8.2 : 3.8, heavy, heavy ? 'heavy-hit' : 'hit');
  };

  const pickupWeapon = (fighter: Runtime) => {
    if (fighter.weapon) return;
    const pickup = weapons
      .filter((weapon) => weapon.available)
      .map((weapon) => ({ weapon, distance: Math.hypot(weapon.x - fighter.position.x, weapon.z - fighter.position.z) }))
      .filter(({ distance }) => distance < 1.25)
      .sort((a, b) => a.distance - b.distance)[0]?.weapon;
    if (!pickup) return;
    fighter.weapon = pickup.type;
    pickup.available = false;
    pickup.respawnAt = elapsed.current + 10 + Math.random() * 6;
    fighter.stats.weaponsPicked += 1;
    fighter.intent = `PICK_${pickup.type.toUpperCase()}`;
    emit({ time: elapsed.current, type: 'weapon-pickup', actor: fighter.id, detail: `${fighter.name} picked up ${pickup.type}` });
    forceArenaRender((value) => value + 1);
  };

  const useWeapon = (attacker: Runtime, action: Action) => {
    if (!attacker.weapon) return;
    const weapon = attacker.weapon;
    attacker.stats.weaponsUsed += 1;
    emit({ time: elapsed.current, type: 'weapon-use', actor: attacker.id, detail: `${attacker.name} used ${weapon}` });

    if (weapon === 'shield') {
      attacker.shieldTimer = 4.5;
    } else {
      const targets = runtimes
        .filter((candidate) => candidate !== attacker && !candidate.eliminated && candidate.respawnTimer <= 0)
        .map((candidate) => ({ candidate, d: Math.hypot(candidate.position.x - attacker.position.x, candidate.position.z - attacker.position.z) }))
        .sort((a, b) => a.d - b.d);

      if (weapon === 'hammer') {
        const target = targets.find(({ d }) => d < 2.9)?.candidate;
        if (target) applyHit(attacker, target, 18, 11.5, true, 'hammered');
      }

      if (weapon === 'push-gun') {
        const target = targets.find(({ d }) => d < 6.2)?.candidate;
        if (target) applyHit(attacker, target, 2, 14, true, 'blasted');
      }

      if (weapon === 'bomb') {
        for (const { candidate, d } of targets.filter(({ d }) => d < 4.2)) {
          applyHit(attacker, candidate, Math.max(5, 14 - d * 2), Math.max(4, 11 - d), true, 'bombed');
        }
        shake.current = 1;
      }
    }

    attacker.weapon = undefined;
    attacker.attackFlash = 0.24;
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
    if (type === 'shrink') radius.current = Math.max(6.2, radius.current - 0.9);
    emit({ time: elapsed.current, type: 'chaos', detail: `Chaos event: ${type}` });
    nextChaos.current = elapsed.current + 14 + Math.random() * 7;
    shake.current = 0.42;
    forceArenaRender((value) => value + 1);
  };

  useFrame((_, rawDt) => {
    if (finished.current) return;
    const dt = Math.min(rawDt, 1 / 30);
    elapsed.current += dt;

    for (const weapon of weapons) {
      if (!weapon.available && elapsed.current >= weapon.respawnAt) {
        const angle = Math.random() * Math.PI * 2;
        const r = 3.6 + Math.random() * Math.max(1.2, radius.current - 5);
        weapon.x = Math.cos(angle) * r;
        weapon.z = Math.sin(angle) * r;
        weapon.available = true;
        forceArenaRender((value) => value + 1);
      }
    }

    if (elapsed.current > nextChaos.current) triggerChaos();
    if (chaos.current !== 'none' && chaos.current !== 'shrink' && elapsed.current > chaosUntil.current) {
      chaos.current = 'none';
      wind.current = { x: 0, z: 0 };
      forceArenaRender((value) => value + 1);
    }

    impacts.current = impacts.current.filter((fx) => elapsed.current - fx.bornAt < 0.45);

    for (const fighter of runtimes) {
      fighter.attackCooldown = Math.max(0, fighter.attackCooldown - dt);
      fighter.heavyCooldown = Math.max(0, fighter.heavyCooldown - dt);
      fighter.dodgeCooldown = Math.max(0, fighter.dodgeCooldown - dt);
      fighter.hitFlash = Math.max(0, fighter.hitFlash - dt);
      fighter.attackFlash = Math.max(0, fighter.attackFlash - dt);
      fighter.shieldTimer = Math.max(0, fighter.shieldTimer - dt);
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
        weapons: weaponSnapshots(fighter),
        arena: { radius: radius.current, chaos: chaos.current, wind: { ...wind.current } },
        recentEvents: events.current.slice(-10),
      };
      const action = fighter.controller.act(obs);
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
      if (action.pickup) pickupWeapon(fighter);
      if (action.useWeapon) useWeapon(fighter, action);
      if (action.attack) attack(fighter, false);
      if (action.heavyAttack) attack(fighter, true);

      const damping = chaos.current === 'ice' ? 0.992 : 0.94;
      fighter.velocity.x *= Math.pow(damping, dt * 60);
      fighter.velocity.z *= Math.pow(damping, dt * 60);
      const speed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
      const maxSpeed = chaos.current === 'low-gravity' ? 7.5 : 6.6;
      if (speed > maxSpeed) {
        fighter.velocity.x *= maxSpeed / speed;
        fighter.velocity.z *= maxSpeed / speed;
      }
      fighter.position.x += fighter.velocity.x * dt;
      fighter.position.z += fighter.velocity.z * dt;

      if (Math.hypot(fighter.position.x, fighter.position.z) > radius.current + OUT_MARGIN) loseStock(fighter);
    }

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
          const rel = (b.velocity.x - a.velocity.x) * nx + (b.velocity.z - a.velocity.z) * nz;
          if (rel < 0) {
            const impulse = -rel * 0.42;
            a.velocity.x -= nx * impulse;
            a.velocity.z -= nz * impulse;
            b.velocity.x += nx * impulse;
            b.velocity.z += nz * impulse;
          }
        }
      }
    }

    const remaining = runtimes.filter((fighter) => !fighter.eliminated);
    const timeLeft = Math.max(0, MATCH_SECONDS - elapsed.current);
    if (remaining.length <= 1 || timeLeft <= 0) {
      finished.current = true;
      const winner = remaining.length === 1 ? remaining[0] : [...remaining].sort((a, b) => (b.stocks * 100 - b.damage) - (a.stocks * 100 - a.damage))[0];
      if (winner) emit({ time: elapsed.current, type: 'win', actor: winner.id, detail: `${winner.name} wins` });
      shake.current = 0.85;
    }

    hudTick.current += dt;
    if (hudTick.current > 0.1 || finished.current) {
      hudTick.current = 0;
      const winEvent = [...events.current].reverse().find((event) => event.type === 'win');
      onHud({
        fighters: runtimes.map(({ id, name, color, damage, stocks, intent, eliminated, stats, weapon }) => ({ id, name, color, damage, stocks, intent, eliminated, stats, weapon })),
        time: timeLeft,
        chaos: chaos.current,
        radius: radius.current,
        events: events.current,
        winner: winEvent?.actor ? runtimes.find((fighter) => fighter.id === winEvent.actor)?.name : undefined,
      });
    }
  });

  return (
    <>
      <CameraDirector shake={shake} />
      <ArenaFloor radius={radius.current} chaos={chaos.current} />
      {weapons.map((weapon) => <WeaponPickup key={weapon.id} weapon={weapon} />)}
      {runtimes.map((fighter) => <Robot key={fighter.id} fighter={fighter} />)}
      {impacts.current.map((fx) => <Impact key={fx.id} fx={fx} now={elapsed.current} />)}
    </>
  );
}

function FighterCard({ fighter }: { fighter: HudFighter }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold" style={{ color: fighter.color }}>{fighter.name}</div>
          <div className="mt-1 text-[11px] text-slate-500">{defaultAgents.find((agent) => agent.id === fighter.id)?.strategy.label}</div>
        </div>
        <div className="text-right text-xs text-slate-300">{fighter.eliminated ? 'ELIMINATED' : `${Math.round(fighter.damage)}% · ${fighter.stocks} stock`}</div>
      </div>
      <div className="mt-2 truncate text-xs font-medium tracking-wide text-slate-200">{fighter.intent.replaceAll('_', ' ')}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>hits {fighter.stats.hits}</span>
        <span>dmg {Math.round(fighter.stats.damageDealt)}</span>
        <span>KO {fighter.stats.kos}</span>
        <span>items {fighter.stats.weaponsPicked}/{fighter.stats.weaponsUsed}</span>
        {fighter.weapon && <span className="text-slate-300">holding {fighter.weapon}</span>}
      </div>
    </div>
  );
}

export default function ArenaExperience() {
  const [hud, setHud] = useState<HudPayload>({ fighters: [], time: MATCH_SECONDS, chaos: 'none', radius: START_RADIUS, events: [] });
  const [matchKey, setMatchKey] = useState(0);

  return (
    <main className="grid min-h-screen bg-[#060810] text-white lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="relative min-h-[70vh] overflow-hidden lg:min-h-screen">
        <div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2 text-xs">
          <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-xl">{hud.time.toFixed(1)}s</div>
          <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-xl">3 Stocks · Last AI Standing</div>
          <div className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 capitalize backdrop-blur-xl">Chaos: {hud.chaos}</div>
        </div>

        {hud.chaos !== 'none' && (
          <div className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black tracking-[0.18em] backdrop-blur-xl">
            CHAOS · {hud.chaos.toUpperCase()}
          </div>
        )}

        {hud.winner && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/35 backdrop-blur-[2px]">
            <div className="text-center">
              <div className="text-xs font-bold tracking-[0.35em] text-amber-300">WINNER</div>
              <div className="mt-3 text-5xl font-black tracking-tight">{hud.winner}</div>
            </div>
          </div>
        )}

        <Canvas key={matchKey} shadows dpr={[1, 1.6]} camera={{ position: [0, 13.5, 17], fov: 46 }} gl={{ antialias: true }}>
          <color attach="background" args={['#070a12']} />
          <fog attach="fog" args={['#070a12', 16, 36]} />
          <ambientLight intensity={0.72} />
          <directionalLight castShadow position={[7, 14, 8]} intensity={2.1} color="#dbe6ff" shadow-mapSize={[1024, 1024]} />
          <pointLight position={[-8, 5, -5]} intensity={26} distance={20} color="#5e7cff" />
          <pointLight position={[7, 4, 4]} intensity={22} distance={18} color="#c15cff" />
          <ArenaEngine onHud={setHud} />
          <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.15}>
            <Text position={[0, 5.8, -7.5]} fontSize={0.72} color="#cdd8ff" anchorX="center" fillOpacity={0.14}>
              AGENT FIGHTING
            </Text>
          </Float>
        </Canvas>
      </section>

      <aside className="border-l border-white/10 bg-[#090c14]/95 p-4 lg:h-screen lg:overflow-y-auto">
        <div className="mb-4">
          <div className="text-lg font-black tracking-tight">AI Brawl Arena</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Controllers are generated once, locked, then called every simulation step. Weapons and chaos continuously change the observation.</p>
        </div>

        <button
          type="button"
          onClick={() => { setHud({ fighters: [], time: MATCH_SECONDS, chaos: 'none', radius: START_RADIUS, events: [] }); setMatchKey((value) => value + 1); }}
          className="mb-4 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-white"
        >
          Restart Match
        </button>

        <div className="space-y-2">
          {hud.fighters.map((fighter) => <FighterCard key={fighter.id} fighter={fighter} />)}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Combat Feed</div>
          <div className="mt-3 space-y-1.5 font-mono text-[10px] leading-4 text-slate-500">
            {[...hud.events].reverse().slice(0, 14).map((event, index) => (
              <div key={`${event.time}-${index}`} className={event.type === 'eliminated' || event.type === 'win' ? 'text-slate-100' : ''}>
                <span className="mr-2 text-slate-700">{event.time.toFixed(1)}</span>{event.detail}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}
