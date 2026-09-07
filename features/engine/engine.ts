import { sanitizeAction } from './actions';
import { createObservation } from './observation';
import { createRng } from './rng';
import type {
  Action,
  AgentController,
  AgentDefinition,
  ArenaConfig,
  ArenaEngine,
  FighterState,
  FighterStats,
  MatchEvent,
  MatchSummary,
  WeaponState,
  WeaponType,
  WorldState,
} from './types';

const DEFAULT_CONFIG: ArenaConfig = {
  seed: 1,
  durationSeconds: 90,
  tickRate: 30,
  startRadius: 9.5,
  outMargin: 1.6,
  stocksPerAgent: 3,
  respawnSeconds: 2.2,
  chaos: {
    enabled: true,
    firstAtSeconds: 11,
    intervalMinSeconds: 14,
    intervalMaxSeconds: 21,
    durationSeconds: 9,
  },
  weapons: {
    enabled: true,
    respawnSeconds: 12,
    types: ['hammer', 'shield', 'push-gun', 'bomb'],
  },
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
    distanceTravelled: 0,
    timeNearEdge: 0,
    timeInCenter: 0,
  };
}

function cloneStats(stats: FighterStats): FighterStats {
  return { ...stats };
}

function mergeConfig(input?: Partial<ArenaConfig>): ArenaConfig {
  return {
    ...DEFAULT_CONFIG,
    ...input,
    chaos: { ...DEFAULT_CONFIG.chaos, ...(input?.chaos ?? {}) },
    weapons: { ...DEFAULT_CONFIG.weapons, ...(input?.weapons ?? {}) },
  };
}

function buildFighter(agent: AgentDefinition, index: number, count: number, config: ArenaConfig): FighterState {
  const angle = (index / count) * Math.PI * 2;
  const spawnRadius = Math.min(4.8, config.startRadius * 0.55);
  return {
    id: agent.id,
    name: agent.name,
    color: agent.color,
    position: { x: Math.cos(angle) * spawnRadius, z: Math.sin(angle) * spawnRadius },
    velocity: { x: 0, z: 0 },
    damage: 0,
    stocks: config.stocksPerAgent,
    distanceToEdge: config.startRadius - spawnRadius,
    stunnedFor: 0,
    respawnFor: 0,
    eliminated: false,
    shieldFor: 0,
    intent: 'SPAWN',
    cooldowns: { attack: 0, heavyAttack: 0, dodge: 0 },
    stats: emptyStats(),
  };
}

function buildWeapons(config: ArenaConfig): WeaponState[] {
  if (!config.weapons.enabled) return [];
  return config.weapons.types.map((type, index, all) => {
    const angle = (index / all.length) * Math.PI * 2 + Math.PI / 4;
    return {
      id: `weapon-${index}`,
      type,
      position: { x: Math.cos(angle) * 6.1, z: Math.sin(angle) * 6.1 },
      available: true,
      respawnAt: 0,
    };
  });
}

export function createArenaEngine(
  agents: AgentDefinition[],
  inputConfig?: Partial<ArenaConfig>,
): ArenaEngine {
  if (agents.length < 2) throw new Error('Arena requires at least two agents');

  const config = mergeConfig(inputConfig);
  const rng = createRng(config.seed);
  const dt = 1 / config.tickRate;
  const controllers = new Map<string, AgentController>(agents.map((agent) => [agent.id, agent.createController()]));
  let eventId = 0;
  let nextChaosAt = config.chaos.firstAtSeconds;

  const state: WorldState = {
    matchId: `match-${config.seed}`,
    seed: config.seed,
    phase: 'ready',
    tick: 0,
    time: 0,
    timeLeft: config.durationSeconds,
    arenaRadius: config.startRadius,
    chaos: { type: 'none', until: 0, wind: { x: 0, z: 0 } },
    fighters: agents.map((agent, index) => buildFighter(agent, index, agents.length, config)),
    weapons: buildWeapons(config),
    events: [],
  };

  const emit = (event: Omit<MatchEvent, 'id' | 'tick' | 'time'>) => {
    state.events.push({ id: ++eventId, tick: state.tick, time: state.time, ...event });
  };

  const living = () => state.fighters.filter((fighter) => !fighter.eliminated);

  const respawn = (fighter: FighterState) => {
    const angle = rng.range(0, Math.PI * 2);
    const radius = Math.min(3.4, state.arenaRadius * 0.45);
    fighter.position = { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
    fighter.velocity = { x: 0, z: 0 };
    fighter.damage *= 0.35;
    fighter.respawnFor = 0;
    fighter.weapon = undefined;
    fighter.intent = 'RESPAWN';
    emit({ type: 'respawn', actor: fighter.id, detail: `${fighter.name} respawned` });
  };

  const loseStock = (fighter: FighterState) => {
    if (fighter.eliminated || fighter.respawnFor > 0) return;
    fighter.stocks -= 1;
    fighter.stats.stocksLost += 1;
    fighter.weapon = undefined;
    emit({ type: 'stock-lost', actor: fighter.id, detail: `${fighter.name} lost a stock` });

    if (fighter.lastAttacker) {
      const attacker = state.fighters.find((candidate) => candidate.id === fighter.lastAttacker);
      if (attacker && attacker.id !== fighter.id) attacker.stats.kos += 1;
    }

    if (fighter.stocks <= 0) {
      fighter.eliminated = true;
      emit({ type: 'eliminated', actor: fighter.id, detail: `${fighter.name} eliminated` });
    } else {
      fighter.respawnFor = config.respawnSeconds;
    }
  };

  const applyHit = (attacker: FighterState, target: FighterState, damage: number, baseKnockback: number, label: string) => {
    const dx = target.position.x - attacker.position.x;
    const dz = target.position.z - attacker.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const shieldScale = target.shieldFor > 0 ? 0.35 : 1;
    const appliedDamage = damage * shieldScale;
    target.damage += appliedDamage;
    const knockback = baseKnockback * (1 + target.damage / 110) * shieldScale;
    target.velocity.x += (dx / length) * knockback;
    target.velocity.z += (dz / length) * knockback;
    target.stunnedFor = Math.max(target.stunnedFor, label === 'heavy' || label === 'hammer' ? 0.18 : 0.08);
    target.lastAttacker = attacker.id;
    attacker.stats.hits += 1;
    attacker.stats.damageDealt += appliedDamage;
    target.stats.damageTaken += appliedDamage;
    emit({
      type: 'hit',
      actor: attacker.id,
      target: target.id,
      detail: `${attacker.name} ${label}-hit ${target.name}`,
      meta: { damage: appliedDamage, knockback },
    });
  };

  const nearestTarget = (attacker: FighterState, range: number) => state.fighters
    .filter((target) => target.id !== attacker.id && !target.eliminated && target.respawnFor <= 0)
    .map((target) => ({ target, distance: Math.hypot(target.position.x - attacker.position.x, target.position.z - attacker.position.z) }))
    .filter(({ distance }) => distance <= range)
    .sort((a, b) => a.distance - b.distance)[0]?.target;

  const resolveAttack = (fighter: FighterState, action: Action) => {
    if (fighter.stunnedFor > 0) return;

    if (action.heavyAttack && fighter.cooldowns.heavyAttack <= 0) {
      fighter.cooldowns.heavyAttack = 0.92;
      fighter.stats.attacks += 1;
      fighter.stats.heavyAttacks += 1;
      const target = nearestTarget(fighter, 2.45);
      if (target) applyHit(fighter, target, 15, 8.2, 'heavy');
      return;
    }

    if (action.attack && fighter.cooldowns.attack <= 0) {
      fighter.cooldowns.attack = 0.3;
      fighter.stats.attacks += 1;
      const target = nearestTarget(fighter, 1.85);
      if (target) applyHit(fighter, target, 6, 3.8, 'normal');
    }
  };

  const resolvePickup = (fighter: FighterState, action: Action) => {
    if (!action.pickup || fighter.weapon || !config.weapons.enabled) return;
    const item = state.weapons
      .filter((weapon) => weapon.available)
      .map((weapon) => ({ weapon, distance: Math.hypot(weapon.position.x - fighter.position.x, weapon.position.z - fighter.position.z) }))
      .filter(({ distance }) => distance <= 0.9)
      .sort((a, b) => a.distance - b.distance)[0]?.weapon;
    if (!item) return;

    fighter.weapon = item.type;
    fighter.stats.weaponsPicked += 1;
    item.available = false;
    item.respawnAt = state.time + config.weapons.respawnSeconds;
    emit({ type: 'weapon-pickup', actor: fighter.id, detail: `${fighter.name} picked ${item.type}`, meta: { weapon: item.type } });
  };

  const consumeWeapon = (fighter: FighterState) => {
    const weapon = fighter.weapon;
    fighter.weapon = undefined;
    fighter.stats.weaponsUsed += 1;
    emit({ type: 'weapon-use', actor: fighter.id, detail: `${fighter.name} used ${weapon}`, meta: { weapon: weapon ?? 'none' } });
    return weapon;
  };

  const resolveWeapon = (fighter: FighterState, action: Action) => {
    if (!action.useWeapon || !fighter.weapon) return;
    const weapon = consumeWeapon(fighter);

    if (weapon === 'shield') {
      fighter.shieldFor = 4;
      return;
    }

    if (weapon === 'hammer') {
      const target = nearestTarget(fighter, 2.9);
      if (target) applyHit(fighter, target, 18, 11.5, 'hammer');
      return;
    }

    if (weapon === 'push-gun') {
      const aimLength = Math.hypot(action.aimX ?? 0, action.aimZ ?? 0) || 1;
      const ax = (action.aimX ?? 0) / aimLength;
      const az = (action.aimZ ?? 0) / aimLength;
      const target = state.fighters
        .filter((candidate) => candidate.id !== fighter.id && !candidate.eliminated && candidate.respawnFor <= 0)
        .map((candidate) => {
          const dx = candidate.position.x - fighter.position.x;
          const dz = candidate.position.z - fighter.position.z;
          const distance = Math.hypot(dx, dz) || 1;
          const alignment = (dx / distance) * ax + (dz / distance) * az;
          return { candidate, distance, alignment };
        })
        .filter(({ distance, alignment }) => distance < 9 && alignment > 0.88)
        .sort((a, b) => a.distance - b.distance)[0]?.candidate;
      if (target) applyHit(fighter, target, 3, 13, 'push-gun');
      return;
    }

    if (weapon === 'bomb') {
      for (const target of state.fighters) {
        if (target.id === fighter.id || target.eliminated || target.respawnFor > 0) continue;
        const distance = Math.hypot(target.position.x - fighter.position.x, target.position.z - fighter.position.z);
        if (distance < 4.2) applyHit(fighter, target, 10, 8.5 * (1 - distance / 6), 'bomb');
      }
    }
  };

  const resolveBodyCollisions = () => {
    for (let i = 0; i < state.fighters.length; i += 1) {
      for (let j = i + 1; j < state.fighters.length; j += 1) {
        const a = state.fighters[i]!;
        const b = state.fighters[j]!;
        if (a.eliminated || b.eliminated || a.respawnFor > 0 || b.respawnFor > 0) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distance = Math.hypot(dx, dz);
        const minDistance = 0.92;
        if (distance <= 0 || distance >= minDistance) continue;
        const nx = dx / distance;
        const nz = dz / distance;
        const push = (minDistance - distance) * 0.5;
        a.position.x -= nx * push;
        a.position.z -= nz * push;
        b.position.x += nx * push;
        b.position.z += nz * push;
      }
    }
  };

  const triggerChaos = () => {
    if (!config.chaos.enabled) return;
    const type = rng.pick(['ice', 'wind', 'low-gravity', 'shrink'] as const);
    state.chaos.type = type;
    state.chaos.until = state.time + config.chaos.durationSeconds;
    state.chaos.wind = { x: 0, z: 0 };

    if (type === 'wind') {
      const angle = rng.range(0, Math.PI * 2);
      state.chaos.wind = { x: Math.cos(angle) * 4.5, z: Math.sin(angle) * 4.5 };
    }
    if (type === 'shrink') state.arenaRadius = Math.max(6.4, state.arenaRadius - 0.8);

    emit({ type: 'chaos', detail: `Chaos event: ${type}`, meta: { chaos: type } });
    nextChaosAt = state.time + rng.range(config.chaos.intervalMinSeconds, config.chaos.intervalMaxSeconds);
  };

  const finishIfNeeded = () => {
    const remaining = living();
    if (remaining.length > 1 && state.timeLeft > 0) return false;

    state.phase = 'finished';
    const winner = remaining.length === 1
      ? remaining[0]
      : [...remaining].sort((a, b) => (b.stocks * 100 - b.damage) - (a.stocks * 100 - a.damage))[0];
    state.winnerId = winner?.id;
    if (winner) emit({ type: 'win', actor: winner.id, detail: `${winner.name} wins` });
    return true;
  };

  const step = () => {
    if (state.phase === 'finished') return state;
    if (state.phase === 'ready') {
      state.phase = 'running';
      emit({ type: 'match-start', detail: `Match ${state.matchId} started` });
    }

    state.tick += 1;
    state.time = state.tick * dt;
    state.timeLeft = Math.max(0, config.durationSeconds - state.time);

    if (state.time >= nextChaosAt) triggerChaos();
    if (state.chaos.type !== 'none' && state.chaos.type !== 'shrink' && state.time >= state.chaos.until) {
      state.chaos = { type: 'none', until: 0, wind: { x: 0, z: 0 } };
    }

    for (const weapon of state.weapons) {
      if (!weapon.available && state.time >= weapon.respawnAt) weapon.available = true;
    }

    for (const fighter of state.fighters) {
      fighter.cooldowns.attack = Math.max(0, fighter.cooldowns.attack - dt);
      fighter.cooldowns.heavyAttack = Math.max(0, fighter.cooldowns.heavyAttack - dt);
      fighter.cooldowns.dodge = Math.max(0, fighter.cooldowns.dodge - dt);
      fighter.stunnedFor = Math.max(0, fighter.stunnedFor - dt);
      fighter.shieldFor = Math.max(0, fighter.shieldFor - dt);
      if (fighter.eliminated) continue;
      if (fighter.respawnFor > 0) {
        fighter.respawnFor -= dt;
        if (fighter.respawnFor <= 0) respawn(fighter);
      }
    }

    // IMPORTANT: every controller observes the same pre-action world state for this tick.
    const actions = new Map<string, Action>();
    for (const fighter of state.fighters) {
      if (fighter.eliminated || fighter.respawnFor > 0) continue;
      const controller = controllers.get(fighter.id)!;
      try {
        actions.set(fighter.id, sanitizeAction(controller.act(createObservation(state, fighter.id))));
      } catch {
        actions.set(fighter.id, sanitizeAction(null));
      }
    }

    for (const fighter of state.fighters) {
      const action = actions.get(fighter.id);
      if (!action || fighter.eliminated || fighter.respawnFor > 0) continue;
      fighter.intent = action.intent ?? 'UNSPECIFIED';

      if (fighter.stunnedFor <= 0) {
        const acceleration = state.chaos.type === 'ice' ? 4.8 : 7.3;
        fighter.velocity.x += action.moveX * acceleration * dt;
        fighter.velocity.z += action.moveZ * acceleration * dt;

        if (action.dodge && fighter.cooldowns.dodge <= 0) {
          fighter.velocity.x += action.moveX * 3.4;
          fighter.velocity.z += action.moveZ * 3.4;
          fighter.cooldowns.dodge = 1.35;
          fighter.stats.dodges += 1;
        }

        resolvePickup(fighter, action);
        resolveWeapon(fighter, action);
        resolveAttack(fighter, action);
      }
    }

    for (const fighter of state.fighters) {
      if (fighter.eliminated || fighter.respawnFor > 0) continue;
      const before = { ...fighter.position };
      if (state.chaos.type === 'wind') {
        fighter.velocity.x += state.chaos.wind.x * dt;
        fighter.velocity.z += state.chaos.wind.z * dt;
      }

      const damping = state.chaos.type === 'ice' ? 0.992 : 0.94;
      fighter.velocity.x *= Math.pow(damping, dt * 60);
      fighter.velocity.z *= Math.pow(damping, dt * 60);

      const speed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
      const maxSpeed = state.chaos.type === 'low-gravity' ? 7.4 : 6.6;
      if (speed > maxSpeed) {
        fighter.velocity.x *= maxSpeed / speed;
        fighter.velocity.z *= maxSpeed / speed;
      }

      fighter.position.x += fighter.velocity.x * dt;
      fighter.position.z += fighter.velocity.z * dt;
      fighter.stats.distanceTravelled += Math.hypot(fighter.position.x - before.x, fighter.position.z - before.z);
      fighter.distanceToEdge = state.arenaRadius - Math.hypot(fighter.position.x, fighter.position.z);
      if (fighter.distanceToEdge < 2) fighter.stats.timeNearEdge += dt;
      else fighter.stats.timeInCenter += dt;

      if (Math.hypot(fighter.position.x, fighter.position.z) > state.arenaRadius + config.outMargin) loseStock(fighter);
    }

    resolveBodyCollisions();
    finishIfNeeded();
    return state;
  };

  const getSummary = (): MatchSummary | null => {
    if (state.phase !== 'finished') return null;
    const ranking = [...state.fighters]
      .sort((a, b) => {
        if (a.id === state.winnerId) return -1;
        if (b.id === state.winnerId) return 1;
        return (b.stocks * 100 - b.damage) - (a.stocks * 100 - a.damage);
      })
      .map((fighter, index) => ({
        id: fighter.id,
        name: fighter.name,
        rank: index + 1,
        stats: cloneStats(fighter.stats),
        damage: fighter.damage,
        stocks: fighter.stocks,
      }));

    return {
      matchId: state.matchId,
      seed: state.seed,
      duration: state.time,
      winnerId: state.winnerId,
      ranking,
      events: state.events.map((event) => ({ ...event, meta: event.meta ? { ...event.meta } : undefined })),
    };
  };

  return {
    getState: () => state,
    step,
    run: (maxTicks = Math.ceil(config.durationSeconds * config.tickRate) + 1) => {
      let ticks = 0;
      while (state.phase !== 'finished' && ticks < maxTicks) {
        step();
        ticks += 1;
      }
      return state;
    },
    getSummary,
  };
}

export { DEFAULT_CONFIG };
