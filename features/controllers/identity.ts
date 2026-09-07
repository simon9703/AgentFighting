import type { ControllerSubmission } from './spec';

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createSourceHash(source: string): string {
  return `fnv1a-${fnv1a(source)}`;
}

export function createControllerId(submission: Pick<ControllerSubmission, 'agentId' | 'model' | 'source'>): string {
  return `${submission.agentId}:${submission.model}:${createSourceHash(submission.source)}`;
}
