import { z } from 'zod';

export const controllerStrategySchema = z.object({
  label: z.string().min(1).max(80),
  summary: z.string().min(1).max(500),
  riskTolerance: z.number().min(0).max(1),
  aggression: z.number().min(0).max(1),
  retreatDamage: z.number().min(0).max(300),
  edgeAvoidance: z.number().min(0).max(1),
  targetPolicy: z.enum(['nearest', 'weakest', 'strongest', 'last-attacker', 'dynamic']),
  weaponPriority: z.array(z.enum(['hammer', 'shield', 'push-gun', 'bomb'])).max(4),
});

export const controllerSubmissionSchema = z.object({
  schemaVersion: z.literal(1),
  agentId: z.string().min(1).max(80),
  model: z.string().min(1).max(120),
  strategy: controllerStrategySchema,
  source: z.string().min(1),
});

export type ControllerStrategyManifest = z.infer<typeof controllerStrategySchema>;
export type ControllerSubmission = z.infer<typeof controllerSubmissionSchema>;

export function parseControllerSubmission(input: unknown): ControllerSubmission {
  return controllerSubmissionSchema.parse(input);
}
