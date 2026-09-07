import { IDLE_ACTION, type Action, type ControllerExecutionInput, type ControllerRuntime } from '@/features/engine';
import type { MatchRecord } from './types';

/**
 * Replays already-sanitized actions from a MatchRecord. Controllers are never
 * called, which makes this suitable for deterministic record verification.
 */
export function createPlaybackRuntime(record: MatchRecord): ControllerRuntime {
  const actionsByTick = new Map(record.ticks.map((tick) => [tick.tick, tick.actions]));

  return {
    execute(input: ControllerExecutionInput): Action {
      const action = actionsByTick.get(input.observation.tick)?.[input.agentId];
      return action ? { ...action } : { ...IDLE_ACTION };
    },
  };
}
