import type { Action, AgentId, ArenaConfig, EngineTickRecord, MatchEvent, MatchSummary, WorldState } from '@/features/engine';

export const REPLAY_SCHEMA_VERSION = 1 as const;

export interface ControllerDescriptor {
  agentId: AgentId;
  model?: string;
  controllerId: string;
  sourceHash?: string;
  strategyLabel?: string;
}

export interface ReplayTick {
  tick: number;
  time: number;
  actions: Record<AgentId, Action>;
  state: WorldState;
}

export interface MatchRecord {
  schemaVersion: typeof REPLAY_SCHEMA_VERSION;
  engineVersion: string;
  createdAt: string;
  seed: number;
  config: ArenaConfig;
  controllers: ControllerDescriptor[];
  initialState: WorldState;
  ticks: ReplayTick[];
  events: MatchEvent[];
  summary?: MatchSummary;
}

export interface ReplayRecorder {
  recordTick(record: EngineTickRecord): void;
  finalize(summary?: MatchSummary): MatchRecord;
  getRecord(): MatchRecord;
}
