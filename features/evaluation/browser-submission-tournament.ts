import { parseControllerSubmission, type ControllerSubmission } from '@/features/controllers';
import {
  aggregateTournamentSummaries,
  createArenaEngine,
  type AgentDefinition,
  type ArenaConfig,
  type MatchSummary,
  type TournamentResult,
} from '@/features/engine';
import { createReplayRecorder, type MatchRecord } from '@/features/replay';
import { BrowserWorkerControllerRuntime, collectSameTickActions } from '@/features/sandbox';
import { createControllerLock, type ControllerLock } from './controller-lock';
import { createTournamentArtifact, type TournamentArtifact } from './tournament-artifact';

const PALETTE = ['#9b8cff', '#52d273', '#52b8ff', '#65e0c3', '#ffd267', '#ff7db4', '#ff9d63', '#8fe2f2'];

export interface BrowserEvaluationProgress {
  phase: 'starting' | 'match' | 'completed';
  matchIndex: number;
  matchCount: number;
  seed?: number;
  tick?: number;
  timedOut?: string[];
  failed?: string[];
}

export interface BrowserEvaluateSubmissionsInput {
  submissions: unknown[];
  seeds: number[];
  engineVersion: string;
  config?: Omit<Partial<ArenaConfig>, 'seed'>;
  startupTimeoutMs?: number;
  perTickTimeoutMs?: number;
  onProgress?: (progress: BrowserEvaluationProgress) => void;
  signal?: AbortSignal;
}

export interface BrowserSubmissionTournamentResult {
  agents: AgentDefinition[];
  lock: ControllerLock;
  tournament: TournamentResult;
  records: MatchRecord[];
  artifact: TournamentArtifact;
  diagnostics: { timedOut: Record<string, number>; failed: Record<string, number> };
}

function buildExternalAgents(submissions: ControllerSubmission[]): AgentDefinition[] {
  const ids = new Set<string>();
  return submissions.map((submission, index) => {
    if (ids.has(submission.agentId)) throw new Error(`Duplicate submission agentId: ${submission.agentId}`);
    ids.add(submission.agentId);
    return {
      id: submission.agentId,
      name: submission.agentId,
      color: PALETTE[index % PALETTE.length]!,
      // External evaluation never invokes this controller. Actions enter through
      // prepareTick()/resolvePreparedTick() after isolated Worker collection.
      createController: () => ({ act: () => ({ moveX: 0, moveZ: 0, intent: 'EXTERNAL' }) }),
    };
  });
}

function increment(target: Record<string, number>, ids: string[]) {
  ids.forEach((id) => { target[id] = (target[id] ?? 0) + 1; });
}

/**
 * Browser path for untrusted-ish user source: one Worker runtime per controller,
 * same immutable prepared-tick observations, concurrent decisions, then one
 * authoritative engine resolution. This is fault isolation, not a hardened
 * hostile multi-tenant security sandbox.
 */
export async function evaluateControllerSubmissionsInBrowser(input: BrowserEvaluateSubmissionsInput): Promise<BrowserSubmissionTournamentResult> {
  if (input.seeds.length === 0) throw new Error('Evaluation needs at least one seed.');
  const submissions = input.submissions.map(parseControllerSubmission);
  const lock = createControllerLock(submissions, input.engineVersion);
  const agents = buildExternalAgents(submissions);
  const records: MatchRecord[] = [];
  const summaries: MatchSummary[] = [];
  const diagnostics = { timedOut: {} as Record<string, number>, failed: {} as Record<string, number> };

  input.onProgress?.({ phase: 'starting', matchIndex: 0, matchCount: input.seeds.length });

  for (let matchIndex = 0; matchIndex < input.seeds.length; matchIndex += 1) {
    if (input.signal?.aborted) throw new DOMException('Evaluation cancelled', 'AbortError');
    const seed = input.seeds[matchIndex]!;
    const runtimes = new Map(submissions.map((submission) => [
      submission.agentId,
      new BrowserWorkerControllerRuntime(submission.source, { startupTimeoutMs: input.startupTimeoutMs ?? 1000 }),
    ]));

    let recorder: ReturnType<typeof createReplayRecorder>;
    const engine = createArenaEngine(agents, { ...input.config, seed }, {
      onTick: (record) => recorder.recordTick(record),
    });
    recorder = createReplayRecorder({
      engineVersion: input.engineVersion,
      config: engine.getConfig() as ArenaConfig,
      controllers: lock.controllers,
      initialState: engine.getState(),
    });

    try {
      const maxTicks = Math.ceil(engine.getConfig().durationSeconds * engine.getConfig().tickRate) + 1;
      let iterations = 0;
      while (!engine.getSummary() && iterations < maxTicks) {
        if (input.signal?.aborted) throw new DOMException('Evaluation cancelled', 'AbortError');
        const prepared = engine.prepareTick();
        if (!prepared) break;
        const slots = Object.entries(prepared.observations).map(([agentId, observation]) => ({
          agentId,
          observation,
          runtime: runtimes.get(agentId)!,
        }));
        const collection = await collectSameTickActions(slots, input.perTickTimeoutMs ?? 20);
        increment(diagnostics.timedOut, collection.timedOut);
        increment(diagnostics.failed, collection.failed);
        engine.resolvePreparedTick(collection.actions);
        iterations += 1;
        if (iterations % 30 === 0) {
          input.onProgress?.({
            phase: 'match',
            matchIndex,
            matchCount: input.seeds.length,
            seed,
            tick: engine.getState().tick,
            timedOut: collection.timedOut,
            failed: collection.failed,
          });
          // Yield so React/browser input remains responsive even when controllers are fast.
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }

      const summary = engine.getSummary();
      if (!summary) throw new Error(`Match with seed ${seed} did not finish`);
      summaries.push(summary);
      records.push(recorder.finalize(summary));
    } finally {
      await Promise.all([...runtimes.values()].map(async (runtime) => runtime.dispose()));
    }
  }

  const tournament = aggregateTournamentSummaries(agents, input.seeds, summaries);
  const artifact = createTournamentArtifact({ lock, submissions, tournament, records });
  input.onProgress?.({ phase: 'completed', matchIndex: input.seeds.length, matchCount: input.seeds.length });
  return { agents, lock, tournament, records, artifact, diagnostics };
}
