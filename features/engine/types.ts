export type AgentId = string;
export type Vec2 = { x: number; z: number };

export type WeaponType = 'hammer' | 'shield' | 'push-gun' | 'bomb';
export type ChaosType = 'none' | 'ice' | 'wind' | 'low-gravity' | 'shrink';
export type MatchPhase = 'ready' | 'running' | 'finished';

export interface ArenaConfig {
  seed: number;
  durationSeconds: number;
  tickRate: number;
  startRadius: number;
  outMargin: number;
  stocksPerAgent: number;
  respawnSeconds: number;
  chaos: { enabled: boolean; firstAtSeconds: number; intervalMinSeconds: number; intervalMaxSeconds: number; durationSeconds: number };
  weapons: { enabled: boolean; respawnSeconds: number; types: WeaponType[] };
}

export interface FighterState {
  id: AgentId; name: string; color: string; position: Vec2; velocity: Vec2; damage: number; stocks: number;
  distanceToEdge: number; stunnedFor: number; respawnFor: number; eliminated: boolean; weapon?: WeaponType;
  shieldFor: number; lastAttacker?: AgentId; intent: string;
  cooldowns: { attack: number; heavyAttack: number; dodge: number };
  stats: FighterStats;
}

export interface WeaponState { id: string; type: WeaponType; position: Vec2; available: boolean; respawnAt: number }

export interface WorldState {
  matchId: string; seed: number; phase: MatchPhase; tick: number; time: number; timeLeft: number; arenaRadius: number;
  chaos: { type: ChaosType; until: number; wind: Vec2 };
  fighters: FighterState[]; weapons: WeaponState[]; events: MatchEvent[]; winnerId?: AgentId;
}

export interface FighterObservation {
  id: AgentId; name: string; position: Vec2; velocity: Vec2; damage: number; stocks: number; distanceToEdge: number;
  stunned: boolean; weapon?: WeaponType; intent: string;
}

export interface WeaponObservation { id: string; type: WeaponType; position: Vec2; distance: number; available: boolean }

export interface Observation {
  tick: number; time: number; timeLeft: number; self: FighterObservation; enemies: FighterObservation[]; weapons: WeaponObservation[];
  arena: { radius: number; chaos: ChaosType; wind: Vec2 }; recentEvents: MatchEvent[];
}

export interface Action {
  moveX: number; moveZ: number; attack?: boolean; heavyAttack?: boolean; dodge?: boolean; pickup?: boolean; useWeapon?: boolean;
  aimX?: number; aimZ?: number; intent?: string;
}

export interface AgentController { act(observation: Readonly<Observation>): Action }
export interface AgentDefinition { id: AgentId; name: string; color: string; createController(): AgentController }
export interface ControllerExecutionInput { agentId: AgentId; controller: AgentController; observation: Readonly<Observation> }
export interface ControllerRuntime { execute(input: ControllerExecutionInput): Action | null; dispose?(): void }

export interface FighterStats {
  attacks: number; hits: number; heavyAttacks: number; dodges: number; damageDealt: number; damageTaken: number; kos: number;
  stocksLost: number; weaponsPicked: number; weaponsUsed: number; distanceTravelled: number; timeNearEdge: number; timeInCenter: number;
}

export type MatchEventType = 'match-start' | 'hit' | 'weapon-pickup' | 'weapon-use' | 'stock-lost' | 'respawn' | 'eliminated' | 'chaos' | 'win';

export interface MatchEvent {
  id: number; tick: number; time: number; type: MatchEventType; actor?: AgentId; target?: AgentId; detail: string;
  meta?: Record<string, string | number | boolean>;
}

export interface MatchSummary {
  matchId: string; seed: number; duration: number; winnerId?: AgentId;
  ranking: Array<{ id: AgentId; name: string; rank: number; stats: FighterStats; damage: number; stocks: number }>;
  events: MatchEvent[];
}

export interface EngineTickRecord { tick: number; time: number; actions: Record<AgentId, Action>; state: Readonly<WorldState> }
export interface PreparedArenaTick { tick: number; time: number; observations: Readonly<Record<AgentId, Readonly<Observation>>> }
export type ExternalActionSet = Readonly<Record<AgentId, Action | null | undefined>> | Map<AgentId, Action | null | undefined>;
export interface EngineOptions { runtime?: ControllerRuntime; onTick?: (record: EngineTickRecord) => void }
export interface EngineSnapshot { state: Readonly<WorldState> }

export interface ArenaEngine {
  getState(): Readonly<WorldState>;
  getConfig(): Readonly<ArenaConfig>;
  prepareTick(): PreparedArenaTick | null;
  resolvePreparedTick(actions: ExternalActionSet): Readonly<WorldState>;
  step(): Readonly<WorldState>;
  run(maxTicks?: number): Readonly<WorldState>;
  getSummary(): MatchSummary | null;
}
