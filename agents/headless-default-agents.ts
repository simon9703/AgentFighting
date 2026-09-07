import type { Action, AgentController, AgentDefinition, Observation } from '@/features/engine/types';

type Style = {
  aggression: number;
  retreatDamage: number;
  edgeAvoidance: number;
  weaponBias: number;
  targetPolicy: 'nearest' | 'weakest' | 'strongest' | 'last-attacker';
};

const normalize = (x: number, z: number) => {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
};

const distance = (a: { position: { x: number; z: number } }, b: { position: { x: number; z: number } }) =>
  Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);

function chooseTarget(observation: Observation, policy: Style['targetPolicy']) {
  const enemies = observation.enemies;
  if (!enemies.length) return null;
  if (policy === 'weakest') return [...enemies].sort((a, b) => b.damage - a.damage)[0]!;
  if (policy === 'strongest') return [...enemies].sort((a, b) => a.damage - b.damage)[0]!;
  if (policy === 'last-attacker') {
    const hit = [...observation.recentEvents].reverse().find((event) => event.type === 'hit' && event.target === observation.self.id);
    const attacker = enemies.find((enemy) => enemy.id === hit?.actor);
    if (attacker) return attacker;
  }
  return [...enemies].sort((a, b) => distance(a, observation.self) - distance(b, observation.self))[0]!;
}

function createController(style: Style): AgentController {
  return {
    act(observation): Action {
      const self = observation.self;
      const target = chooseTarget(observation, style.targetPolicy);
      const center = normalize(-self.position.x, -self.position.z);
      let moveX = 0;
      let moveZ = 0;
      let attack = false;
      let heavyAttack = false;
      let dodge = false;
      let pickup = false;
      let useWeapon = false;
      let aimX = 0;
      let aimZ = 0;
      let intent = 'POSITION';

      if (self.distanceToEdge < 1.5 + style.edgeAvoidance * 2.2) {
        moveX += center.x * 1.5;
        moveZ += center.z * 1.5;
        intent = 'ESCAPE_EDGE';
      }

      const availableWeapon = observation.weapons
        .filter((weapon) => weapon.available)
        .sort((a, b) => a.distance - b.distance)[0];

      if (!self.weapon && availableWeapon && availableWeapon.distance < 5.5 * style.weaponBias) {
        const dir = normalize(availableWeapon.position.x - self.position.x, availableWeapon.position.z - self.position.z);
        moveX += dir.x * (0.7 + style.weaponBias);
        moveZ += dir.z * (0.7 + style.weaponBias);
        pickup = availableWeapon.distance < 1.1;
        intent = `GET_${availableWeapon.type.toUpperCase()}`;
      }

      if (target) {
        const toward = normalize(target.position.x - self.position.x, target.position.z - self.position.z);
        const targetDistance = distance(target, self);
        const survivalPressure = self.damage / Math.max(1, style.retreatDamage);

        if (survivalPressure > 1 && target.distanceToEdge > 2) {
          moveX -= toward.x;
          moveZ -= toward.z;
          dodge = targetDistance < 3;
          intent = 'RETREAT';
        } else if (targetDistance < 2.3) {
          moveX += toward.x * 0.35;
          moveZ += toward.z * 0.35;
          heavyAttack = style.aggression > 0.72 && target.damage > 55;
          attack = !heavyAttack;
          intent = heavyAttack ? 'HEAVY_ATTACK' : 'ATTACK';
        } else {
          moveX += toward.x * (0.35 + style.aggression);
          moveZ += toward.z * (0.35 + style.aggression);
          intent = style.aggression > 0.7 ? 'CHASE' : intent;
        }

        if (self.weapon) {
          useWeapon = self.weapon === 'shield'
            ? self.damage > style.retreatDamage * 0.75
            : targetDistance < (self.weapon === 'push-gun' ? 8 : self.weapon === 'bomb' ? 3.8 : 2.8);
          aimX = toward.x;
          aimZ = toward.z;
          if (useWeapon) intent = `USE_${self.weapon.toUpperCase()}`;
        }
      }

      if (observation.arena.chaos === 'wind' && self.distanceToEdge < 4.5) {
        moveX -= observation.arena.wind.x * 0.1;
        moveZ -= observation.arena.wind.z * 0.1;
        intent = 'COUNTER_WIND';
      }

      const move = normalize(moveX, moveZ);
      return { moveX: move.x, moveZ: move.z, attack, heavyAttack, dodge, pickup, useWeapon, aimX, aimZ, intent };
    },
  };
}

const defs: Array<{ id: string; name: string; color: string; style: Style }> = [
  { id: 'claude', name: 'Claude', color: '#9b8cff', style: { aggression: 0.38, retreatDamage: 62, edgeAvoidance: 0.92, weaponBias: 0.8, targetPolicy: 'last-attacker' } },
  { id: 'codex', name: 'Codex', color: '#52d273', style: { aggression: 0.9, retreatDamage: 30, edgeAvoidance: 0.46, weaponBias: 0.45, targetPolicy: 'weakest' } },
  { id: 'gemini', name: 'Gemini', color: '#52b8ff', style: { aggression: 0.6, retreatDamage: 45, edgeAvoidance: 0.64, weaponBias: 1, targetPolicy: 'nearest' } },
  { id: 'gpt', name: 'GPT', color: '#65e0c3', style: { aggression: 0.62, retreatDamage: 50, edgeAvoidance: 0.72, weaponBias: 0.65, targetPolicy: 'strongest' } },
  { id: 'qwen', name: 'Qwen', color: '#ffd267', style: { aggression: 0.76, retreatDamage: 36, edgeAvoidance: 0.4, weaponBias: 0.72, targetPolicy: 'weakest' } },
  { id: 'deepseek', name: 'DeepSeek', color: '#ff7db4', style: { aggression: 0.42, retreatDamage: 70, edgeAvoidance: 0.96, weaponBias: 0.55, targetPolicy: 'nearest' } },
];

export const headlessDefaultAgents: AgentDefinition[] = defs.map((definition) => ({
  id: definition.id,
  name: definition.name,
  color: definition.color,
  createController: () => createController(definition.style),
}));
