export type FighterId = 'claude' | 'codex' | 'gemini' | 'gpt' | 'qwen' | 'deepseek';

export type Vec2 = { x: number; z: number };

export type ChaosType = 'none' | 'ice' | 'wind' | 'low-gravity' | 'shrink';
export type WeaponType = 'hammer' | 'shield' | 'push-gun' | 'bomb';

export interface WeaponSnapshot {
  id: string;
  type: WeaponType;
  position: Vec2;
  distance: number;
  available: boolean;
}

export interface FighterSnapshot {
  id: FighterId;
  name: string;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  stocks: number;
  distanceToEdge: number;
  stunned: boolean;
  intent: string;
  weapon?: WeaponType;
}

export interface Observation {
  time: number;
  self: FighterSnapshot;
  enemies: FighterSnapshot[];
  weapons: WeaponSnapshot[];
  arena: {
    radius: number;
    chaos: ChaosType;
    wind: Vec2;
  };
  recentEvents: MatchEvent[];
}

export interface Action {
  moveX: number;
  moveZ: number;
  attack: boolean;
  heavyAttack: boolean;
  dodge: boolean;
  pickup: boolean;
  useWeapon: boolean;
  aim?: Vec2;
  intent: string;
}

export interface AgentStrategy {
  label: string;
  aggression: number;
  riskTolerance: number;
  retreatDamage: number;
  edgeAvoidance: number;
  weaponBias: number;
  targetPolicy: 'nearest' | 'weakest' | 'strongest' | 'last-attacker';
}

export interface AgentController {
  act(observation: Observation): Action;
}

export interface AgentDefinition {
  id: FighterId;
  name: string;
  color: string;
  strategy: AgentStrategy;
  createController(): AgentController;
}

export type MatchEvent = {
  time: number;
  type: 'hit' | 'stock-lost' | 'eliminated' | 'respawn' | 'chaos' | 'win' | 'weapon-pickup' | 'weapon-use';
  actor?: FighterId;
  target?: FighterId;
  detail: string;
};

export interface FighterStats {
  attacks: number;
  hits: number;
  heavyAttacks: number;
  dodges: number;
  damageDealt: number;
  damageTaken: number;
  kos: number;
  stocksLost: number;
  weaponsPicked: number;
  weaponsUsed: number;
}
