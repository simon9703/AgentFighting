import { controllerSubmissionSchema, type ControllerSubmission } from '@/features/controllers';
import type { TournamentResult } from '@/features/engine';
import type { MatchRecord } from '@/features/replay';
import { parseControllerLock, type ControllerLock } from './controller-lock';

export const TOURNAMENT_ARTIFACT_SCHEMA_VERSION = 1 as const;

/** Portable, JSON-safe bundle for GitHub records, replay viewers and reports. */
export interface TournamentArtifact {
  schemaVersion: typeof TOURNAMENT_ARTIFACT_SCHEMA_VERSION;
  createdAt: string;
  lock: ControllerLock;
  submissions: ControllerSubmission[];
  tournament: TournamentResult;
  records: MatchRecord[];
}

export function createTournamentArtifact(input: Omit<TournamentArtifact, 'schemaVersion' | 'createdAt'>, createdAt = new Date().toISOString()): TournamentArtifact {
  return { schemaVersion: TOURNAMENT_ARTIFACT_SCHEMA_VERSION, createdAt, ...input };
}

export function serializeTournamentArtifact(artifact: TournamentArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertReplayRecord(value: unknown, index: number): asserts value is MatchRecord {
  if (!isObject(value)) throw new Error(`records[${index}] must be an object`);
  if (value.schemaVersion !== 1) throw new Error(`records[${index}] has unsupported schemaVersion`);
  if (typeof value.seed !== 'number') throw new Error(`records[${index}].seed must be a number`);
  if (!Array.isArray(value.ticks)) throw new Error(`records[${index}].ticks must be an array`);
  if (!isObject(value.initialState)) throw new Error(`records[${index}].initialState is missing`);
  value.ticks.forEach((tick, tickIndex) => {
    if (!isObject(tick) || typeof tick.tick !== 'number' || !isObject(tick.state)) {
      throw new Error(`records[${index}].ticks[${tickIndex}] is invalid`);
    }
  });
}

/** Strict enough for product import without coupling artifact portability to one giant Zod mirror of engine state. */
export function parseTournamentArtifact(input: unknown): TournamentArtifact {
  if (!isObject(input)) throw new Error('Artifact must be a JSON object.');
  if (input.schemaVersion !== TOURNAMENT_ARTIFACT_SCHEMA_VERSION) throw new Error('Unsupported tournament artifact schema version.');
  if (typeof input.createdAt !== 'string') throw new Error('Artifact createdAt must be a string.');
  if (!Array.isArray(input.submissions) || input.submissions.length < 2) throw new Error('Artifact must contain at least two submissions.');
  if (!Array.isArray(input.records) || input.records.length === 0) throw new Error('Artifact must contain replay records.');
  if (!isObject(input.tournament)) throw new Error('Artifact tournament result is missing.');

  const submissions = input.submissions.map((submission, index) => {
    const parsed = controllerSubmissionSchema.safeParse(submission);
    if (!parsed.success) throw new Error(`Invalid submission at index ${index}: ${parsed.error.issues[0]?.message ?? 'schema error'}`);
    return parsed.data;
  });
  const lock = parseControllerLock(input.lock);
  input.records.forEach(assertReplayRecord);

  return {
    schemaVersion: TOURNAMENT_ARTIFACT_SCHEMA_VERSION,
    createdAt: input.createdAt,
    lock,
    submissions,
    tournament: input.tournament as unknown as TournamentResult,
    records: input.records as unknown as MatchRecord[],
  };
}

export function parseTournamentArtifactJson(json: string): TournamentArtifact {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid artifact JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parseTournamentArtifact(value);
}
