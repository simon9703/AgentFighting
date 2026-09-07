import {
  createArenaEngine,
  type AgentDefinition,
  type ArenaConfig,
  type MatchSummary,
  type WorldState,
} from '@/features/engine';

export interface MatchSession {
  getState(): Readonly<WorldState>;
  step(): Readonly<WorldState>;
  subscribe(listener: (state: Readonly<WorldState>) => void): () => void;
  getSummary(): MatchSummary | null;
}

/**
 * Renderer-facing adapter for a live headless match. Renderers may step and
 * subscribe, but never receive mutable engine state or controller internals.
 */
export function createMatchSession(
  agents: AgentDefinition[],
  config?: Partial<ArenaConfig>,
): MatchSession {
  const engine = createArenaEngine(agents, config);
  const listeners = new Set<(state: Readonly<WorldState>) => void>();

  return {
    getState: () => engine.getState(),
    step() {
      const state = engine.step();
      listeners.forEach((listener) => listener(state));
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(engine.getState());
      return () => listeners.delete(listener);
    },
    getSummary: () => engine.getSummary(),
  };
}
