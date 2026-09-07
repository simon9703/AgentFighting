import type { AgentDefinition } from '@/features/engine';
import { createControllerId, createSourceHash } from './identity';
import { compileTrustedControllerSource } from './source-compiler';
import type { ControllerSubmission } from './spec';

export interface SubmittedAgent extends AgentDefinition {
  controllerId: string;
  sourceHash: string;
  model: string;
  strategyLabel: string;
}

export function createSubmittedAgent(
  submission: ControllerSubmission,
  presentation: Pick<AgentDefinition, 'name' | 'color'>,
): SubmittedAgent {
  const createController = compileTrustedControllerSource(submission.source);
  return {
    id: submission.agentId,
    name: presentation.name,
    color: presentation.color,
    createController,
    controllerId: createControllerId(submission),
    sourceHash: createSourceHash(submission.source),
    model: submission.model,
    strategyLabel: submission.strategy.label,
  };
}
