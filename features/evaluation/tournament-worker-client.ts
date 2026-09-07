import type { BrowserEvaluateSubmissionsInput, BrowserEvaluationProgress } from './browser-submission-tournament';
import type { ControllerLock } from './controller-lock';
import type { TournamentArtifact } from './tournament-artifact';
import type { TournamentResult } from '@/features/engine';
import type { MatchRecord } from '@/features/replay';

export interface TournamentWorkerResult {
  lock: ControllerLock;
  tournament: TournamentResult;
  records: MatchRecord[];
  artifact: TournamentArtifact;
  diagnostics: { timedOut: Record<string, number>; failed: Record<string, number> };
}

export interface TournamentWorkerRun {
  promise: Promise<TournamentWorkerResult>;
  cancel(): void;
}

export function runTournamentInWorker(
  input: Omit<BrowserEvaluateSubmissionsInput, 'onProgress' | 'signal'>,
  onProgress?: (progress: BrowserEvaluationProgress) => void,
): TournamentWorkerRun {
  const worker = new Worker(new URL('./tournament-evaluation.worker.ts', import.meta.url), {
    type: 'module',
    name: 'agent-fighting-tournament',
  });
  const requestId = Date.now() + Math.floor(Math.random() * 100000);
  let settled = false;
  let rejectPromise: ((error: Error) => void) | null = null;

  const promise = new Promise<TournamentWorkerResult>((resolve, reject) => {
    rejectPromise = reject;
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as {
        type: 'progress' | 'complete' | 'error';
        requestId: number;
        progress?: BrowserEvaluationProgress;
        result?: TournamentWorkerResult;
        message?: string;
      };
      if (message.requestId !== requestId) return;
      if (message.type === 'progress' && message.progress) {
        onProgress?.(message.progress);
        return;
      }
      settled = true;
      worker.terminate();
      if (message.type === 'complete' && message.result) resolve(message.result);
      else reject(new Error(message.message ?? 'Tournament worker failed'));
    };
    worker.onerror = () => {
      settled = true;
      worker.terminate();
      reject(new Error('Tournament worker crashed'));
    };
    worker.postMessage({ type: 'start', requestId, input });
  });

  return {
    promise,
    cancel() {
      if (settled) return;
      settled = true;
      worker.terminate();
      rejectPromise?.(new DOMException('Tournament cancelled', 'AbortError'));
    },
  };
}
