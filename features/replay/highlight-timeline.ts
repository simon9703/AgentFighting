import type { MatchEventType } from '@/features/engine';
import type { MatchRecord } from './types';

export interface HighlightEntry {
  id: string;
  tick: number;
  time: number;
  type: MatchEventType;
  actor?: string;
  target?: string;
  label: string;
  priority: number;
}

const PRIORITY: Partial<Record<MatchEventType, number>> = {
  win: 100,
  eliminated: 90,
  'stock-lost': 80,
  chaos: 70,
  'weapon-use': 60,
  hit: 40,
  'weapon-pickup': 30,
  respawn: 20,
  'match-start': 10,
};

/** Compact renderer-agnostic event timeline derived from authoritative replay data. */
export function createHighlightTimeline(record: MatchRecord, limit = 24): HighlightEntry[] {
  const timeline = record.events.map((event) => ({
    id: `event-${event.id}`,
    tick: event.tick,
    time: event.time,
    type: event.type,
    actor: event.actor,
    target: event.target,
    priority: PRIORITY[event.type] ?? 0,
    label: [event.actor ?? 'arena', event.type.replaceAll('-', ' '), event.target ? `→ ${event.target}` : '']
      .filter(Boolean)
      .join(' '),
  }));

  if (timeline.length <= limit) return timeline;

  const mustKeep = timeline
    .filter((entry) => entry.priority >= 70)
    .sort((a, b) => a.tick - b.tick);
  const remaining = timeline
    .filter((entry) => entry.priority < 70)
    .sort((a, b) => b.priority - a.priority || a.tick - b.tick)
    .slice(0, Math.max(0, limit - mustKeep.length));

  return [...mustKeep, ...remaining]
    .sort((a, b) => a.tick - b.tick)
    .slice(0, limit);
}
