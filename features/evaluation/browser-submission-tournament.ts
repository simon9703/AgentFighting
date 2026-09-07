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
  phase: 'starting' | 'match' | 'match-complete' | 'completed';
  matchIndex: number;
  matchCount: number;
  seed?: number;
  tick?: number;
  timedOut?: string[];
  failed?: string[];
  durationsMs?: Record<string, number>;
  partialTournament?: TournamentResult;
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

export interface RuntimeLatencySummary { samples: number; averageMs: number; maxMs: number }
export interface BrowserRuntimeDiagnostics {
  timedOut: Record<string, number>;
  failed: Record<string, number>;
  latency: Record<string, RuntimeLatencySummary>;
}

export interface BrowserSubmissionTournamentResult {
  agents: AgentDefinition[];
  lock: ControllerLock;
  tournament: TournamentResult;
  records: MatchRecord[];
  artifact: TournamentArtifact;
  diagnostics: BrowserRuntimeDiagnostics;
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
      createController: () => ({ act: () => ({ moveX: 0, moveZ: 0, intent: 'EXTERNAL' }) }),
    };
  });
}

function increment(target: Record<string, number>, ids: string[]) {
  ids.forEach((id) => { target[id] = (target[id] ?? 0) + 1; });
}

function recordLatency(target: Record<string, { samples: number; totalMs: number; maxMs: number }>, values: Record<string, number>) {
  for (const [id, duration] of Object.entries(values)) {
    const row = target[id] ?? (target[id] = { samples: 0, totalMs: 0, maxMs: 0 });
    row.samples += 1;
    row.totalMs += duration;
    row.maxMs = Math.max(row.maxMs, duration);
  }
}

/** One Worker runtime per controller, same prepared observations, one authoritative resolution. */
export async function evaluateControllerSubmissionsInBrowser(input: BrowserEvaluateSubmissionsInput): Promise<BrowserSubmissionTournamentResult> {
  if (input.seeds.length === 0) throw new Error('Evaluation needs at least one seed.');
  const submissions = input.submissions.map(parseControllerSubmission);
  const lock = createControllerLock(submissions, input.engineVersion);
  const agents = buildExternalAgents(submissions);
  const records: MatchRecord[] = [];
  const summaries: MatchSummary[] = [];
  const timedOut: Record<string, number> = {};
  const failed: Record<string, number> = {};
  const latencyRows: Record<string, { samples: number; totalMs: number; maxMs: number }> = {};

  input.onProgress?.({ phase: 'starting', matchIndex: 0, matchCount: input.seeds.length });

  for (let matchIndex = 0; matchIndex < input.seeds.length; matchIndex += 1) {
    if (input.signal?.aborted) throw new DOMException('Evaluation cancelled', 'AbortError');
    const seed = input.seeds[matchIndex]!;
    const runtimes = new Map(submissions.map((submission) => [submission.agentId, new BrowserWorkerControllerRuntime(submission.source, { startupTimeoutMs: input.startupTimeoutMs ?? 1000 })]));

    let recorder: ReturnType<typeof createReplayRecorder>;
    const engine = createArenaEngine(agents, { ...input.config, seed }, { onTick: (record) => recorder.recordTick(record) });
    recorder = createReplayRecorder({ engineVersion: input.engineVersion, config: engine.getConfig() as ArenaConfig, controllers: lock.controllers, initialState: engine.getState() });

    try {
      const maxTicks = Math.ceil(engine.getConfig().durationSeconds * engine.getConfig().tickRate) + 1;
      let iterations = 0;
      while (!engine.getSummary() && iterations < maxTicks) {
        if (input.signal?.aborted) throw new DOMException('Evaluation cancelled', 'AbortError');
        const prepared = engine.prepareTick();
        if (!prepared) break;
        const slots = Object.entries(prepared.observations).map(([agentId, observation]) => ({ agentId, observation, runtime: runtimes.get(agentId)! }));
        const collection = await collectSameTickActions(slots, input.perTickTimeoutMs ?? 20);
        increment(timedOut, collection.timedOut);
        increment(failed, collection.failed);
        recordLatency(latencyRows, collection.durationsMs);
        engine.resolvePreparedTick(collection.actions);
        iterations += 1;
        if (iterations % 30 === 0) {
          input.onProgress?.({ phase: 'match', matchIndex, matchCount: input.seeds.length, seed, tick: engine.getState().tick, timedOut: collection.timedOut, failed: collection.failed, durationsMs: collection.durationsMs });
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }

      const summary = engine.getSummary();
      if (!summary) throw new Error(`Match with seed ${seed} did not finish`);
      summaries.push(summary);
      records.push(recorder.finalize(summary));
      input.onProgress?.({
        phase: 'match-complete',
        matchIndex,
        matchCount: input.seeds.length,
        seed,
        tick: engine.getState().tick,
        partialTournament: aggregateTournamentSummaries(agents, input.seeds.slice(0, summaries.length), summaries),
      });
    } finally {
      await Promise.all([...runtimes.values()].map(async (runtime) => runtime.dispose()));
    }
  }

  const tournament = aggregateTournamentSummaries(agents, input.seeds, summaries);
  const artifact = createTournamentArtifact({ lock, submissions, tournament, records });
  const latency = Object.fromEntries(Object.entries(latencyRows).map(([id, row]) => [id, { samples: row.samples, averageMs: row.totalMs / Math.max(1, row.samples), maxMs: row.maxMs }]));
  const diagnostics: BrowserRuntimeDiagnostics = { timedOut, failed, latency };
  input.onProgress?.({ phase: 'completed', matchIndex: input.seeds.length, matchCount: input.seeds.length, partialTournament: tournament });
  return { agents, lock, tournament, records, artifact, diagnostics };
}
