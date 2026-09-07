import type { FighterObservation, FighterState, Observation, WeaponObservation, WorldState } from './types';

function fighterView(fighter: FighterState): FighterObservation {
  return {
    id: fighter.id,
    name: fighter.name,
    position: { ...fighter.position },
    velocity: { ...fighter.velocity },
    damage: fighter.damage,
    stocks: fighter.stocks,
    distanceToEdge: fighter.distanceToEdge,
    stunned: fighter.stunnedFor > 0,
    weapon: fighter.weapon,
    intent: fighter.intent,
  };
}

export function createObservation(world: WorldState, fighterId: string): Observation {
  const self = world.fighters.find((fighter) => fighter.id === fighterId);
  if (!self) throw new Error(`Unknown fighter: ${fighterId}`);

  const weapons: WeaponObservation[] = world.weapons.map((weapon) => ({
    id: weapon.id,
    type: weapon.type,
    position: { ...weapon.position },
    distance: Math.hypot(weapon.position.x - self.position.x, weapon.position.z - self.position.z),
    available: weapon.available,
  }));

  return {
    tick: world.tick,
    time: world.time,
    timeLeft: world.timeLeft,
    self: fighterView(self),
    enemies: world.fighters
      .filter((fighter) => fighter.id !== self.id && !fighter.eliminated && fighter.respawnFor <= 0)
      .map(fighterView),
    weapons,
    arena: {
      radius: world.arenaRadius,
      chaos: world.chaos.type,
      wind: { ...world.chaos.wind },
    },
    recentEvents: world.events.slice(-12).map((event) => ({ ...event, meta: event.meta ? { ...event.meta } : undefined })),
  };
}
