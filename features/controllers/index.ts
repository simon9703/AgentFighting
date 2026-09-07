export { CONTROLLER_TASK_PROMPT, buildControllerPrompt } from './prompt';
export { controllerStrategySchema, controllerSubmissionSchema, parseControllerSubmission } from './spec';
export { createControllerId, createSourceHash } from './identity';
export { validateControllerSource } from './source-policy';
export { ControllerSourceError, compileTrustedControllerSource } from './source-compiler';
export { createSubmittedAgent } from './submission-agent';
export type { ControllerStrategyManifest, ControllerSubmission } from './spec';
export type { SourcePolicyViolation } from './source-policy';
export type { SubmittedAgent } from './submission-agent';
