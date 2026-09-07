import { sanitizeAction } from '@/features/engine/actions';
import type { Action, AgentId, Observation } from '@/features/engine';

export interface AsyncControllerRuntime {
  start?(): Promise<void>;
  execute(agentId: AgentId, observation: Readonly<Observation>): Promise<Action | null>;
  dispose?(): Promise<void> | void;
}

export interface AsyncRuntimeSlot {
  agentId: AgentId;
  runtime: AsyncControllerRuntime;
  observation: Readonly<Observation>;
}

export interface AsyncActionCollection {
  actions: Map<AgentId, Action>;
  timedOut: AgentId[];
  failed: AgentId[];
}

const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('controller-timeout')), ms);
  promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
});

/**
 * Collects every controller decision from one immutable tick snapshot before any
 * authoritative resolution happens. Slow or failed controllers receive the same
 * sanitized neutral fallback, so one participant cannot stall or crash a match.
 */
export async function collectSameTickActions(
  slots: AsyncRuntimeSlot[],
  perTickTimeoutMs = 16,
): Promise<AsyncActionCollection> {
  const timedOut: AgentId[] = [];
  const failed: AgentId[] = [];
  const pairs = await Promise.all(slots.map(async ({ agentId, runtime, observation }) => {
    try {
      const output = await timeout(runtime.execute(agentId, observation), perTickTimeoutMs);
      return [agentId, sanitizeAction(output)] as const;
    } catch (error) {
      if (error instanceof Error && error.message === 'controller-timeout') {
        timedOut.push(agentId);
        await runtime.dispose?.();
      } else {
        failed.push(agentId);
      }
      return [agentId, sanitizeAction(null)] as const;
    }
  }));
  return { actions: new Map(pairs), timedOut, failed };
}
