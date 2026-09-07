import type { ControllerSubmission } from '@/features/controllers';
import type { TournamentResult } from '@/features/engine';
import type { MatchRecord } from '@/features/replay';
import type { ControllerLock } from './controller-lock';

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
  return {
    schemaVersion: TOURNAMENT_ARTIFACT_SCHEMA_VERSION,
    createdAt,
    ...input,
  };
}

export function serializeTournamentArtifact(artifact: TournamentArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
