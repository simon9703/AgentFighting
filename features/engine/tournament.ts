import { createArenaEngine } from './engine';
import type { AgentDefinition, ArenaConfig, FighterStats, MatchSummary } from './types';

export interface BehaviorFingerprint {
  aggression: number;
  accuracy: number;
  weaponUsage: number;
  edgeRisk: number;
  mobility: number;
  survival: number;
}

export interface TournamentAgentResult {
  id: string;
  name: string;
  matches: number;
  wins: number;
  winRate: number;
  averageRank: number;
  averageStats: FighterStats;
  fingerprint: BehaviorFingerprint;
}

export interface TournamentResult {
  seeds: number[];
  matches: MatchSummary[];
  agents: TournamentAgentResult[];
}

const emptyStats = (): FighterStats => ({ attacks: 0, hits: 0, heavyAttacks: 0, dodges: 0, damageDealt: 0, damageTaken: 0, kos: 0, stocksLost: 0, weaponsPicked: 0, weaponsUsed: 0, distanceTravelled: 0, timeNearEdge: 0, timeInCenter: 0 });
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function addStats(target: FighterStats, source: FighterStats) {
  for (const key of Object.keys(target) as Array<keyof FighterStats>) target[key] += source[key];
}

function divideStats(stats: FighterStats, divisor: number): FighterStats {
  const result = emptyStats();
  for (const key of Object.keys(result) as Array<keyof FighterStats>) result[key] = stats[key] / Math.max(1, divisor);
  return result;
}

function createFingerprint(stats: FighterStats, averageRank: number, agentCount: number): BehaviorFingerprint {
  const totalPositionTime = stats.timeNearEdge + stats.timeInCenter;
  return {
    aggression: clamp01(stats.attacks / 90),
    accuracy: clamp01(stats.hits / Math.max(1, stats.attacks)),
    weaponUsage: clamp01(stats.weaponsUsed / Math.max(1, stats.weaponsPicked)),
    edgeRisk: clamp01(stats.timeNearEdge / Math.max(1, totalPositionTime)),
    mobility: clamp01(stats.distanceTravelled / 320),
    survival: clamp01(1 - (averageRank - 1) / Math.max(1, agentCount - 1)),
  };
}

export function aggregateTournamentSummaries(agents: Pick<AgentDefinition, 'id' | 'name'>[], seeds: number[], summaries: MatchSummary[]): TournamentResult {
  const rows = new Map<string, { name: string; wins: number; rankTotal: number; stats: FighterStats }>();
  for (const agent of agents) rows.set(agent.id, { name: agent.name, wins: 0, rankTotal: 0, stats: emptyStats() });

  for (const summary of summaries) {
    for (const result of summary.ranking) {
      const row = rows.get(result.id);
      if (!row) continue;
      if (summary.winnerId === result.id) row.wins += 1;
      row.rankTotal += result.rank;
      addStats(row.stats, result.stats);
    }
  }

  const results: TournamentAgentResult[] = [...rows.entries()].map(([id, row]) => {
    const matches = summaries.length;
    const averageRank = row.rankTotal / Math.max(1, matches);
    const averageStats = divideStats(row.stats, matches);
    return {
      id,
      name: row.name,
      matches,
      wins: row.wins,
      winRate: row.wins / Math.max(1, matches),
      averageRank,
      averageStats,
      fingerprint: createFingerprint(averageStats, averageRank, agents.length),
    };
  }).sort((a, b) => b.winRate - a.winRate || a.averageRank - b.averageRank);

  return { seeds: [...seeds], matches: summaries, agents: results };
}

export function runTournament(agents: AgentDefinition[], seeds: number[], config?: Omit<Partial<ArenaConfig>, 'seed'>): TournamentResult {
  const summaries = seeds.map((seed) => {
    const engine = createArenaEngine(agents, { ...config, seed });
    engine.run();
    const summary = engine.getSummary();
    if (!summary) throw new Error(`Match with seed ${seed} did not finish`);
    return summary;
  });
  return aggregateTournamentSummaries(agents, seeds, summaries);
}
