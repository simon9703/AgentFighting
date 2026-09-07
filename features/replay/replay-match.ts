import { createArenaEngine, type AgentDefinition, type WorldState } from '@/features/engine';
import { createPlaybackRuntime } from './playback-runtime';
import type { MatchRecord } from './types';

export interface ReplayVerification {
  valid: boolean;
  checkedTicks: number;
  mismatch?: {
    tick: number;
    reason: string;
  };
}

export interface ReplayRecordedMatchInput {
  record: MatchRecord;
  agents: AgentDefinition[];
}

function serialiseState(state: Readonly<WorldState>) {
  return JSON.stringify(state);
}

/**
 * Re-simulates a recorded match using its captured actions and reports the
 * first divergent authoritative state. This verifies engine/record integrity;
 * it deliberately does not execute generated controller code again.
 */
export function replayRecordedMatch(input: ReplayRecordedMatchInput): ReplayVerification {
  const engine = createArenaEngine(input.agents, input.record.config, {
    runtime: createPlaybackRuntime(input.record),
  });

  for (const expected of input.record.ticks) {
    const actual = engine.step();
    if (actual.tick !== expected.tick) {
      return { valid: false, checkedTicks: expected.tick - 1, mismatch: { tick: expected.tick, reason: 'Tick number diverged' } };
    }
    if (serialiseState(actual) !== serialiseState(expected.state)) {
      return { valid: false, checkedTicks: expected.tick - 1, mismatch: { tick: expected.tick, reason: 'Authoritative state diverged' } };
    }
  }

  return { valid: true, checkedTicks: input.record.ticks.length };
}
