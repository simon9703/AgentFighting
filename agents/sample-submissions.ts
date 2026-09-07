import type { ControllerSubmission } from '@/features/controllers';

const source = (mode: 'hunter' | 'survivor' | 'looter' | 'duelist') => `
function createController() {
  const normalize = (x, z) => {
    const length = Math.hypot(x, z) || 1;
    return { x: x / length, z: z / length };
  };
  return {
    act(obs) {
      const self = obs.self;
      const center = normalize(-self.position.x, -self.position.z);
      const enemies = [...obs.enemies];
      const nearest = enemies.sort((a, b) => Math.hypot(a.position.x-self.position.x,a.position.z-self.position.z) - Math.hypot(b.position.x-self.position.x,b.position.z-self.position.z))[0];
      const weapon = obs.weapons.filter(w => w.available).sort((a,b)=>a.distance-b.distance)[0];
      let moveX = 0, moveZ = 0, attack = false, heavyAttack = false, dodge = false, pickup = false, useWeapon = false, aimX = 0, aimZ = 0;
      let intent = '${mode.toUpperCase()}';

      if (self.distanceToEdge < ${mode === 'hunter' ? '1.4' : mode === 'survivor' ? '3.4' : '2.2'}) {
        moveX += center.x * 1.7; moveZ += center.z * 1.7; intent = 'RECENTER';
      }

      if (${mode === 'looter' ? 'true' : 'false'} && !self.weapon && weapon && weapon.distance < 6.5) {
        const d = normalize(weapon.position.x-self.position.x, weapon.position.z-self.position.z);
        moveX += d.x * 1.5; moveZ += d.z * 1.5; pickup = weapon.distance < 1.0; intent = 'LOOT';
      }

      if (nearest) {
        const dx = nearest.position.x-self.position.x, dz = nearest.position.z-self.position.z;
        const d = Math.hypot(dx,dz) || 1;
        const toward = { x: dx/d, z: dz/d };
        if ('${mode}' === 'survivor' && self.damage > 48) {
          moveX -= toward.x; moveZ -= toward.z; dodge = d < 3.2; intent = 'RETREAT';
        } else if ('${mode}' === 'hunter') {
          moveX += toward.x * 1.35; moveZ += toward.z * 1.35; heavyAttack = d < 2.4 && nearest.damage > 45; attack = d < 1.8 && !heavyAttack; intent = 'PRESSURE';
        } else if ('${mode}' === 'duelist') {
          const strafe = { x: -toward.z, z: toward.x };
          moveX += toward.x * .65 + strafe.x * .72; moveZ += toward.z * .65 + strafe.z * .72; dodge = d < 1.5; attack = d < 1.75; intent = 'STRAFE';
        } else {
          moveX += toward.x * .7; moveZ += toward.z * .7; attack = d < 1.8; intent = 'ENGAGE';
        }
        if (self.weapon) {
          useWeapon = self.weapon === 'shield' ? self.damage > 38 : d < (self.weapon === 'push-gun' ? 8 : 3.4);
          aimX = toward.x; aimZ = toward.z;
        }
      }
      if (obs.arena.chaos === 'wind') { moveX -= obs.arena.wind.x * .12; moveZ -= obs.arena.wind.z * .12; }
      const move = normalize(moveX, moveZ);
      return { moveX: move.x, moveZ: move.z, attack, heavyAttack, dodge, pickup, useWeapon, aimX, aimZ, intent };
    }
  };
}`;

export const sampleControllerSubmissions: ControllerSubmission[] = [
  {
    schemaVersion: 1,
    agentId: 'hunter',
    model: 'sample-hunter',
    strategy: { label: 'Relentless Hunter', summary: 'High pressure, closes distance and converts damage into heavy attacks.', riskTolerance: .86, aggression: .92, retreatDamage: 85, edgeAvoidance: .35, targetPolicy: 'nearest', weaponPriority: ['hammer', 'push-gun'] },
    source: source('hunter'),
  },
  {
    schemaVersion: 1,
    agentId: 'survivor',
    model: 'sample-survivor',
    strategy: { label: 'Adaptive Survivor', summary: 'Prioritizes center control, disengages at high damage and dodges threats.', riskTolerance: .28, aggression: .36, retreatDamage: 48, edgeAvoidance: .94, targetPolicy: 'last-attacker', weaponPriority: ['shield', 'push-gun'] },
    source: source('survivor'),
  },
  {
    schemaVersion: 1,
    agentId: 'looter',
    model: 'sample-looter',
    strategy: { label: 'Weapon Opportunist', summary: 'Detours aggressively for pickups and converts weapon access into pressure.', riskTolerance: .58, aggression: .58, retreatDamage: 62, edgeAvoidance: .6, targetPolicy: 'dynamic', weaponPriority: ['bomb', 'hammer', 'push-gun', 'shield'] },
    source: source('looter'),
  },
  {
    schemaVersion: 1,
    agentId: 'duelist',
    model: 'sample-duelist',
    strategy: { label: 'Mobile Duelist', summary: 'Uses strafing, spacing and short-range dodges instead of pure chase behavior.', riskTolerance: .52, aggression: .66, retreatDamage: 58, edgeAvoidance: .7, targetPolicy: 'nearest', weaponPriority: ['push-gun', 'hammer'] },
    source: source('duelist'),
  },
];
