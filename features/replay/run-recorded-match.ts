import { createArenaEngine, type AgentDefinition, type ArenaConfig, type ControllerRuntime } from '@/features/engine';
import { createInProcessRuntime, createRecordingRuntime, wrapAgentsWithRuntime } from '@/features/sandbox';
import { createReplayRecorder } from './recorder';
import type { ControllerDescriptor, MatchRecord } from './types';

export interface RunRecordedMatchInput {
  agents: AgentDefinition[];
  config: ArenaConfig;
  controllers: ControllerDescriptor[];
  engineVersion: string;
  runtime?: ControllerRuntime;
  maxTicks?: number;
}

export function runRecordedMatch(input: RunRecordedMatchInput): MatchRecord {
  const delegate = input.runtime ?? createInProcessRuntime();
  const recordingRuntime = createRecordingRuntime(delegate);
  const wrappedAgents = wrapAgentsWithRuntime(input.agents, recordingRuntime);
  const engine = createArenaEngine(wrappedAgents, input.config);

  const recorder = createReplayRecorder({
    engineVersion: input.engineVersion,
    config: input.config,
    controllers: input.controllers,
    initialState: engine.getState(),
  });

  const maxTicks = input.maxTicks ?? Math.ceil(input.config.durationSeconds * input.config.tickRate) + 1;
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
