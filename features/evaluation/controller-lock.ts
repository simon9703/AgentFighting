import { z } from 'zod';
import { createControllerId, createSourceHash, type ControllerSubmission } from '@/features/controllers';

export const CONTROLLER_LOCK_SCHEMA_VERSION = 1 as const;

export const lockedControllerSchema = z.object({
  agentId: z.string().min(1),
  model: z.string().min(1),
  controllerId: z.string().min(1),
  sourceHash: z.string().min(1),
  strategyLabel: z.string().min(1),
});

export const controllerLockSchema = z.object({
  schemaVersion: z.literal(CONTROLLER_LOCK_SCHEMA_VERSION),
  engineVersion: z.string().min(1),
  lockedAt: z.string().datetime(),
  lockHash: z.string().min(1),
  controllers: z.array(lockedControllerSchema).min(2),
});

export type LockedController = z.infer<typeof lockedControllerSchema>;
export type ControllerLock = z.infer<typeof controllerLockSchema>;

/**
 * Immutable identity record created before a match or tournament begins.
 * It deliberately stores no executable source: source belongs in the submission
 * archive, while the lock is safe to embed in public match/replay metadata.
 */
export function createControllerLock(
  submissions: ControllerSubmission[],
  engineVersion: string,
  lockedAt = new Date().toISOString(),
): ControllerLock {
  const agentIds = new Set<string>();
  const controllers = submissions.map((submission) => {
    if (agentIds.has(submission.agentId)) {
      throw new Error(`Duplicate submission agentId: ${submission.agentId}`);
    }
    agentIds.add(submission.agentId);
    return {
      agentId: submission.agentId,
      model: submission.model,
      controllerId: createControllerId(submission),
      sourceHash: createSourceHash(submission.source),
      strategyLabel: submission.strategy.label,
    };
  }).sort((a, b) => a.agentId.localeCompare(b.agentId));

  const lockHash = createSourceHash(JSON.stringify({
    schemaVersion: CONTROLLER_LOCK_SCHEMA_VERSION,
    engineVersion,
    controllers,
  }));

  return controllerLockSchema.parse({
    schemaVersion: CONTROLLER_LOCK_SCHEMA_VERSION,
    engineVersion,
    lockedAt,
    lockHash,
    controllers,
  });
}

export function parseControllerLock(input: unknown): ControllerLock {
  return controllerLockSchema.parse(input);
}
