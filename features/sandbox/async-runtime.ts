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
  durationsMs: Record<AgentId, number>;
}

const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('controller-timeout')), ms);
  promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
});

const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

/** Collect every decision from one immutable snapshot before authoritative resolution. */
export async function collectSameTickActions(slots: AsyncRuntimeSlot[], perTickTimeoutMs = 16): Promise<AsyncActionCollection> {
  const timedOut: AgentId[] = [];
  const failed: AgentId[] = [];
  const durationsMs: Record<AgentId, number> = {};
  const pairs = await Promise.all(slots.map(async ({ agentId, runtime, observation }) => {
    const started = now();
    try {
      const output = await timeout(runtime.execute(agentId, observation), perTickTimeoutMs);
      durationsMs[agentId] = now() - started;
      return [agentId, sanitizeAction(output)] as const;
    } catch (error) {
      durationsMs[agentId] = now() - started;
      if (error instanceof Error && error.message === 'controller-timeout') {
        timedOut.push(agentId);
        await runtime.dispose?.();
      } else failed.push(agentId);
      return [agentId, sanitizeAction(null)] as const;
    }
  }));
  return { actions: new Map(pairs), timedOut, failed, durationsMs };
}
