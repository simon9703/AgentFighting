import type { ArenaConfig, EngineTickRecord, MatchSummary, WorldState } from '@/features/engine';
import { REPLAY_SCHEMA_VERSION, type ControllerDescriptor, type MatchRecord, type ReplayRecorder } from './types';

function cloneState(state: Readonly<WorldState>): WorldState {
  return {
    ...state,
    chaos: { ...state.chaos, wind: { ...state.chaos.wind } },
    fighters: state.fighters.map((fighter) => ({
      ...fighter,
      position: { ...fighter.position },
      velocity: { ...fighter.velocity },
      cooldowns: { ...fighter.cooldowns },
      stats: { ...fighter.stats },
    })),
    weapons: state.weapons.map((weapon) => ({ ...weapon, position: { ...weapon.position } })),
    events: state.events.map((event) => ({ ...event, meta: event.meta ? { ...event.meta } : undefined })),
  };
}

export interface CreateReplayRecorderInput {
  engineVersion: string;
  config: ArenaConfig;
  controllers: ControllerDescriptor[];
  initialState: Readonly<WorldState>;
  now?: () => Date;
}

export function createReplayRecorder(input: CreateReplayRecorderInput): ReplayRecorder {
  const record: MatchRecord = {
    schemaVersion: REPLAY_SCHEMA_VERSION,
    engineVersion: input.engineVersion,
    createdAt: (input.now?.() ?? new Date()).toISOString(),
    seed: input.config.seed,
    config: {
      ...input.config,
      chaos: { ...input.config.chaos },
      weapons: { ...input.config.weapons, types: [...input.config.weapons.types] },
    },
    controllers: input.controllers.map((controller) => ({ ...controller })),
    initialState: cloneState(input.initialState),
    ticks: [],
    events: [],
  };

  return {
    recordTick(tick: EngineTickRecord) {
      record.ticks.push({
        tick: tick.tick,
        time: tick.time,
        actions: Object.fromEntries(
          Object.entries(tick.actions).map(([agentId, action]) => [agentId, { ...action }]),
        ),
        state: cloneState(tick.state),
      });
    },

    finalize(summary?: MatchSummary) {
      if (summary) {
        record.summary = {
          ...summary,
          ranking: summary.ranking.map((entry) => ({ ...entry, stats: { ...entry.stats } })),
          events: summary.events.map((event) => ({ ...event, meta: event.meta ? { ...event.meta } : undefined })),
        };
        record.events = record.summary.events.map((event) => ({ ...event, meta: event.meta ? { ...event.meta } : undefined }));
      } else if (record.ticks.length) {
        const last = record.ticks[record.ticks.length - 1]!;
        record.events = last.state.events.map((event) => ({ ...event, meta: event.meta ? { ...event.meta } : undefined }));
      }
      return record;
    },

    getRecord() {
      return record;
    },
  };
}
