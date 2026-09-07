import {
  createSubmittedAgent,
  parseControllerSubmission,
  type ControllerSubmission,
  type SubmittedAgent,
} from '@/features/controllers';
import { runTournament, type ArenaConfig, type TournamentResult } from '@/features/engine';
import { runRecordedMatch, type MatchRecord } from '@/features/replay';

const PALETTE = ['#9b8cff', '#52d273', '#52b8ff', '#65e0c3', '#ffd267', '#ff7db4', '#ff9d63', '#8fe2f2'];

export interface EvaluateSubmissionsInput {
  submissions: unknown[];
  seeds: number[];
  config?: Omit<Partial<ArenaConfig>, 'seed'>;
  engineVersion: string;
  presentation?: Record<string, { name: string; color: string }>;
}

export interface SubmissionTournamentResult {
  agents: SubmittedAgent[];
  tournament: TournamentResult;
  records: MatchRecord[];
}

function buildAgents(
  submissions: ControllerSubmission[],
  presentation: EvaluateSubmissionsInput['presentation'],
): SubmittedAgent[] {
  const ids = new Set<string>();
  return submissions.map((submission, index) => {
    if (ids.has(submission.agentId)) throw new Error(`Duplicate submission agentId: ${submission.agentId}`);
    ids.add(submission.agentId);
    return createSubmittedAgent(submission, presentation?.[submission.agentId] ?? {
      name: submission.agentId,
      color: PALETTE[index % PALETTE.length]!,
    });
  });
}

/**
 * The complete local evaluation path for one-shot model submissions:
 * validate -> compile at the runtime boundary -> many seeded matches ->
 * behavior fingerprint + independently replayable match records.
 */
export function evaluateControllerSubmissions(input: EvaluateSubmissionsInput): SubmissionTournamentResult {
  if (input.seeds.length === 0) throw new Error('Evaluation needs at least one seed.');
  const submissions = input.submissions.map(parseControllerSubmission);
  const agents = buildAgents(submissions, input.presentation);
  const tournament = runTournament(agents, input.seeds, input.config);
  const controllers = agents.map((agent) => ({
    agentId: agent.id,
    model: agent.model,
    controllerId: agent.controllerId,
    sourceHash: agent.sourceHash,
    strategyLabel: agent.strategyLabel,
  }));
  const records = input.seeds.map((seed) => runRecordedMatch({
    agents,
    config: { ...input.config, seed },
    controllers,
    engineVersion: input.engineVersion,
  }));
  return { agents, tournament, records };
}
