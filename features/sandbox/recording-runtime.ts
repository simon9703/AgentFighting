import { sanitizeAction, type Action, type AgentId, type ControllerExecutionInput, type ControllerRuntime } from '@/features/engine';

export interface RecordingControllerRuntime extends ControllerRuntime {
  getActionsForTick(tick: number): Record<AgentId, Action>;
  clearBeforeTick(tick: number): void;
}

export function createRecordingRuntime(delegate: ControllerRuntime): RecordingControllerRuntime {
  const byTick = new Map<number, Record<AgentId, Action>>();

  return {
    execute(input: ControllerExecutionInput): Action {
      const action = sanitizeAction(delegate.execute(input));
      const tickActions = byTick.get(input.observation.tick) ?? {};
      tickActions[input.agentId] = { ...action };
      byTick.set(input.observation.tick, tickActions);
      return action;
    },

    getActionsForTick(tick) {
      const actions = byTick.get(tick) ?? {};
      return Object.fromEntries(
        Object.entries(actions).map(([agentId, action]) => [agentId, { ...action }]),
      );
    },

    clearBeforeTick(tick) {
      for (const storedTick of byTick.keys()) {
        if (storedTick < tick) byTick.delete(storedTick);
      }
    },

    dispose() {
      delegate.dispose?.();
      byTick.clear();
    },
  };
}
