import type { FighterId, FighterStats, MatchEvent, WeaponType } from './types';

export interface AgentMatchSummary {
  matchId: string;
  agentId: FighterId;
  rank: number;
  winner: boolean;
  finalDamage: number;
  stocksRemaining: number;
  stats: FighterStats;
  mostAttackedEnemy?: FighterId;
  mostDamagedBy?: FighterId;
  weaponsUsed: Partial<Record<WeaponType, number>>;
  chaosExperienced: string[];
  highlights: string[];
}

export interface MatchArchive {
  matchId: string;
  seed: string;
  startedAt: string;
  durationSeconds: number;
  winner?: FighterId;
  agents: AgentMatchSummary[];
  events: MatchEvent[];
}

export function buildAgentReviewPrompt(summary: AgentMatchSummary) {
  return [
    'You are reviewing the performance of the fighter controller you generated.',
    'The controller was locked during the match. Do not rewrite code in this review.',
    '',
    `Agent: ${summary.agentId}`,
    `Rank: #${summary.rank}`,
    `Winner: ${summary.winner ? 'yes' : 'no'}`,
    `Stocks remaining: ${summary.stocksRemaining}`,
    `Final damage: ${Math.round(summary.finalDamage)}%`,
    `Damage dealt: ${Math.round(summary.stats.damageDealt)}`,
    `Damage taken: ${Math.round(summary.stats.damageTaken)}`,
    `Hits: ${summary.stats.hits}/${summary.stats.attacks}`,
    `Heavy attacks: ${summary.stats.heavyAttacks}`,
    `Dodges: ${summary.stats.dodges}`,
    `Weapons picked/used: ${summary.stats.weaponsPicked}/${summary.stats.weaponsUsed}`,
    `KOs: ${summary.stats.kos}`,
    `Stocks lost: ${summary.stats.stocksLost}`,
    summary.mostAttackedEnemy ? `Most attacked enemy: ${summary.mostAttackedEnemy}` : '',
    summary.mostDamagedBy ? `Most damaged by: ${summary.mostDamagedBy}` : '',
    summary.chaosExperienced.length ? `Chaos events: ${summary.chaosExperienced.join(', ')}` : '',
    summary.highlights.length ? `Highlights: ${summary.highlights.join(' | ')}` : '',
    '',
    'Return a concise review with:',
    '1. What strategy the controller appeared to follow.',
    '2. What worked.',
    '3. What failed.',
    '4. One hypothesis to test in a future controller version.',
  ].filter(Boolean).join('\n');
}
