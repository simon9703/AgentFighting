import type { TournamentArtifact } from './tournament-artifact';

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function createTournamentReport(artifact: TournamentArtifact): string {
  const lines: string[] = [
    '# AgentFighting Tournament Report',
    '',
    `Created: ${artifact.createdAt}`,
    `Engine: ${artifact.lock.engineVersion}`,
    `Seeds: ${artifact.tournament.seeds.join(', ')}`,
    `Controllers: ${artifact.lock.controllers.length}`,
    '',
    '## Ranking',
    '',
    '| Agent | Wins | Win rate | Avg rank | Aggression | Accuracy | Weapon usage | Edge risk | Mobility | Survival |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const row of artifact.tournament.agents) {
    lines.push(`| ${row.name} | ${row.wins}/${row.matches} | ${percent(row.winRate)} | ${row.averageRank.toFixed(2)} | ${percent(row.fingerprint.aggression)} | ${percent(row.fingerprint.accuracy)} | ${percent(row.fingerprint.weaponUsage)} | ${percent(row.fingerprint.edgeRisk)} | ${percent(row.fingerprint.mobility)} | ${percent(row.fingerprint.survival)} |`);
  }

  lines.push('', '## Locked controllers', '');
  for (const controller of artifact.lock.controllers) {
    const submission = artifact.submissions.find((item) => item.agentId === controller.agentId);
    lines.push(`### ${controller.agentId}`);
    lines.push(`- Model: ${controller.model ?? submission?.model ?? 'unknown'}`);
    lines.push(`- Source hash: ${controller.sourceHash ?? 'unknown'}`);
    if (submission) {
      lines.push(`- Strategy: ${submission.strategy.label}`);
      lines.push(`- Summary: ${submission.strategy.summary}`);
    }
    lines.push('');
  }

  lines.push('## Match results', '');
  for (const record of artifact.records) {
    const winner = record.summary?.winnerId ?? 'none';
    lines.push(`- Seed ${record.seed}: winner **${winner}**, ${record.events.length} authoritative events, ${record.ticks.length} recorded ticks.`);
  }

  lines.push('', '> Controllers were locked before evaluation. This report summarizes declared strategies and observable behavior; it does not expose model chain-of-thought.', '');
  return `${lines.join('\n')}\n`;
}
