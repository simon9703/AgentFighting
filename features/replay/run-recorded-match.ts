import { createArenaEngine, type AgentDefinition, type ArenaConfig, type ControllerRuntime } from '@/features/engine';
import { createInProcessRuntime, createRecordingRuntime } from '@/features/sandbox';
import { createReplayRecorder } from './recorder';
import type { ControllerDescriptor, MatchRecord } from './types';

export interface RunRecordedMatchInput {
  agents: AgentDefinition[];
  config?: Partial<ArenaConfig>;
  controllers: ControllerDescriptor[];
  engineVersion: string;
  runtime?: ControllerRuntime;
  maxTicks?: number;
}

export function runRecordedMatch(input: RunRecordedMatchInput): MatchRecord {
  const delegate = input.runtime ?? createInProcessRuntime();
  const recordingRuntime = createRecordingRuntime(delegate);
  const engine = createArenaEngine(input.agents, input.config, { runtime: recordingRuntime });

  const recorder = createReplayRecorder({
    engineVersion: input.engineVersion,
    config: engine.getConfig(),
    controllers: input.controllers,
    initialState: engine.getState(),
  });

  const config = engine.getConfig();
  const maxTicks = input.maxTicks ?? Math.ceil(config.durationSeconds * config.tickRate) + 1;
  let ticks = 0;

  while (engine.getState().phase !== 'finished' && ticks < maxTicks) {
    const state = engine.step();
    recorder.recordTick({
      tick: state.tick,
      time: state.time,
      actions: recordingRuntime.getActionsForTick(state.tick),
      state,
    });
    recordingRuntime.clearBeforeTick(state.tick);
    ticks += 1;
  }

  const result = recorder.finalize(engine.getSummary() ?? undefined);
  recordingRuntime.dispose?.();
  return result;
}
