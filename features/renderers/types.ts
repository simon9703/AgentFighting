import type { MatchSummary, WorldState } from '@/features/engine';

export interface ArenaRenderer {
  mount?(element: HTMLElement): void;
  render(state: Readonly<WorldState>): void;
  onMatchEnd?(summary: MatchSummary): void;
  dispose?(): void;
}

// Renderers are deliberately passive. They may animate/interpolate state,
// but must never mutate combat rules, damage, stocks, chaos, or winner state.
export { createMatchSession } from './match-session';
export type { MatchSession } from './match-session';
export { createArenaViewModel } from './view-model';
export type { ArenaViewModel, FighterViewModel } from './view-model';
