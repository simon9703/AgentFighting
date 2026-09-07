import type { ChaosType, MatchEvent, WeaponType, WorldState } from '@/features/engine';

export interface FighterViewModel {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  velocityX: number;
  velocityZ: number;
  damage: number;
  stocks: number;
  eliminated: boolean;
  respawning: boolean;
  weapon?: WeaponType;
  intent: string;
}

export interface ArenaViewModel {
  tick: number;
  timeLeft: number;
  radius: number;
  chaos: ChaosType;
  fighters: FighterViewModel[];
  events: MatchEvent[];
  winnerId?: string;
}

/** Converts immutable authoritative state into renderer-friendly primitives. */
export function createArenaViewModel(state: Readonly<WorldState>): ArenaViewModel {
  return {
    tick: state.tick,
    timeLeft: state.timeLeft,
    radius: state.arenaRadius,
    chaos: state.chaos.type,
    winnerId: state.winnerId,
    events: state.events,
    fighters: state.fighters.map((fighter) => ({
      id: fighter.id,
      name: fighter.name,
      color: fighter.color,
      x: fighter.position.x,
      z: fighter.position.z,
      velocityX: fighter.velocity.x,
      velocityZ: fighter.velocity.z,
      damage: fighter.damage,
      stocks: fighter.stocks,
      eliminated: fighter.eliminated,
      respawning: fighter.respawnFor > 0,
      weapon: fighter.weapon,
      intent: fighter.intent,
    })),
  };
}
