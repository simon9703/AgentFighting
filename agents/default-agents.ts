import type { Action, AgentController, AgentDefinition, FighterSnapshot, Observation } from '@/features/arena/types';

function normalize(x: number, z: number) {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

function distance(a: FighterSnapshot, b: FighterSnapshot) {
  return Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
}

function chooseTarget(observation: Observation, policy: AgentDefinition['strategy']['targetPolicy']) {
  const enemies = observation.enemies;
  if (!enemies.length) return null;
  if (policy === 'weakest') return [...enemies].sort((a, b) => b.damage - a.damage)[0];
  if (policy === 'strongest') return [...enemies].sort((a, b) => a.damage - b.damage)[0];
  if (policy === 'last-attacker') {
    const lastHit = [...observation.recentEvents].reverse().find((event) => event.type === 'hit' && event.target === observation.self.id);
    const lastAttacker = enemies.find((enemy) => enemy.id === lastHit?.actor);
    if (lastAttacker) return lastAttacker;
  }
  return [...enemies].sort((a, b) => distance(a, observation.self) - distance(b, observation.self))[0];
}

function createRuleController(definition: Omit<AgentDefinition, 'createController'>): AgentController {
  let lastIntent = 'SPAWN';

  return {
    act(observation): Action {
      const self = observation.self;
      const strategy = definition.strategy;
      const target = chooseTarget(observation, strategy.targetPolicy);
      const center = normalize(-self.position.x, -self.position.z);
      let moveX = 0;
      let moveZ = 0;
      let attack = false;
      let heavyAttack = false;
      let dodge = false;
      let pickup = false;
      let useWeapon = false;
      let aim: Action['aim'];

      const nearestWeapon = [...observation.weapons]
        .filter((weapon) => weapon.available)
        .sort((a, b) => a.distance - b.distance)[0];
      const shouldLoot = !self.weapon && nearestWeapon && nearestWeapon.distance < 5.5 && strategy.weaponBias > 0.45;

      if (self.distanceToEdge < 1.6 + strategy.edgeAvoidance * 2.3) {
        moveX += center.x * 1.5;
        moveZ += center.z * 1.5;
        lastIntent = 'ESCAPE_EDGE';
      }

      if (shouldLoot && nearestWeapon) {
        const toWeapon = normalize(nearestWeapon.position.x - self.position.x, nearestWeapon.position.z - self.position.z);
        moveX += toWeapon.x * (0.8 + strategy.weaponBias);
        moveZ += toWeapon.z * (0.8 + strategy.weaponBias);
        pickup = nearestWeapon.distance < 1.1;
        lastIntent = pickup ? `PICK_${nearestWeapon.type.toUpperCase()}` : `GET_${nearestWeapon.type.toUpperCase()}`;
      } else if (target) {
        const toTarget = normalize(target.position.x - self.position.x, target.position.z - self.position.z);
        const targetDistance = distance(target, self);
        const survivalPressure = self.damage / Math.max(1, strategy.retreatDamage);
        const targetNearEdge = target.distanceToEdge < 2.1;

        if (self.weapon && targetDistance < 4.8) {
          useWeapon = true;
          aim = { x: toTarget.x, z: toTarget.z };
          moveX += toTarget.x * 0.4;
          moveZ += toTarget.z * 0.4;
          lastIntent = `USE_${self.weapon.toUpperCase()}`;
        } else if (survivalPressure > 1 && !targetNearEdge) {
          moveX -= toTarget.x;
          moveZ -= toTarget.z;
          dodge = strategy.riskTolerance < 0.55 && targetDistance < 3.5;
          lastIntent = 'RETREAT';
        } else if (targetNearEdge && targetDistance < 3.2 && strategy.aggression > 0.45) {
          moveX += toTarget.x;
          moveZ += toTarget.z;
          heavyAttack = true;
          lastIntent = 'EDGE_FINISH';
        } else if (targetDistance < 2.25) {
          moveX += toTarget.x * 0.35;
          moveZ += toTarget.z * 0.35;
          heavyAttack = strategy.riskTolerance > 0.72 && target.damage > 65;
          attack = !heavyAttack;
          lastIntent = heavyAttack ? 'HEAVY_ATTACK' : 'ATTACK';
        } else {
          moveX += toTarget.x * (0.45 + strategy.aggression);
          moveZ += toTarget.z * (0.45 + strategy.aggression);
          lastIntent = strategy.aggression > 0.7 ? 'CHASE' : 'POSITION';
        }
      }

      if (observation.arena.chaos === 'wind' && self.distanceToEdge < 4.5) {
        moveX -= observation.arena.wind.x * 0.012;
        moveZ -= observation.arena.wind.z * 0.012;
        lastIntent = 'COUNTER_WIND';
      }

      const move = normalize(moveX, moveZ);
      return { moveX: move.x, moveZ: move.z, attack, heavyAttack, dodge, pickup, useWeapon, aim, intent: lastIntent };
    },
  };
}

const definitions: Array<Omit<AgentDefinition, 'createController'>> = [
  {
    id: 'claude', name: 'Claude', color: '#9b8cff',
    strategy: { label: 'Defensive Opportunist', aggression: 0.38, riskTolerance: 0.34, retreatDamage: 62, edgeAvoidance: 0.92, weaponBias: 0.72, targetPolicy: 'last-attacker' },
  },
  {
    id: 'codex', name: 'Codex', color: '#52d273',
    strategy: { label: 'Aggressive Hunter', aggression: 0.9, riskTolerance: 0.84, retreatDamage: 30, edgeAvoidance: 0.46, weaponBias: 0.34, targetPolicy: 'weakest' },
  },
  {
    id: 'gemini', name: 'Gemini', color: '#52b8ff',
    strategy: { label: 'High-Mobility Scavenger', aggression: 0.6, riskTolerance: 0.64, retreatDamage: 45, edgeAvoidance: 0.64, weaponBias: 0.95, targetPolicy: 'nearest' },
  },
  {
    id: 'gpt', name: 'GPT', color: '#65e0c3',
    strategy: { label: 'Balanced Counter', aggression: 0.62, riskTolerance: 0.52, retreatDamage: 50, edgeAvoidance: 0.72, weaponBias: 0.58, targetPolicy: 'strongest' },
  },
  {
    id: 'qwen', name: 'Qwen', color: '#ffd267',
    strategy: { label: 'Risky Flanker', aggression: 0.76, riskTolerance: 0.78, retreatDamage: 36, edgeAvoidance: 0.4, weaponBias: 0.82, targetPolicy: 'weakest' },
  },
  {
    id: 'deepseek', name: 'DeepSeek', color: '#ff7db4',
    strategy: { label: 'Survival First', aggression: 0.42, riskTolerance: 0.28, retreatDamage: 70, edgeAvoidance: 0.96, weaponBias: 0.46, targetPolicy: 'nearest' },
  },
];

export const defaultAgents: AgentDefinition[] = definitions.map((definition) => ({
  ...definition,
  createController: () => createRuleController(definition),
}));
