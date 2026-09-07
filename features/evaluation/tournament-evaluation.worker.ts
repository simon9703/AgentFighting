import { evaluateControllerSubmissionsInBrowser, type BrowserEvaluateSubmissionsInput } from './browser-submission-tournament';

interface StartMessage {
  type: 'start';
  requestId: number;
  input: Omit<BrowserEvaluateSubmissionsInput, 'onProgress' | 'signal'>;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<StartMessage>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type !== 'start') return;
  void evaluateControllerSubmissionsInBrowser({
    ...message.input,
    onProgress: (progress) => scope.postMessage({ type: 'progress', requestId: message.requestId, progress }),
  }).then((result) => {
    // AgentDefinition contains createController functions and is not structured-cloneable.
    // The artifact is the portable evidence product, so only clone-safe outputs cross back.
    scope.postMessage({
      type: 'complete',
      requestId: message.requestId,
      result: {
        lock: result.lock,
        tournament: result.tournament,
        records: result.records,
        artifact: result.artifact,
        diagnostics: result.diagnostics,
      },
    });
  }).catch((error) => {
    scope.postMessage({
      type: 'error',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  });
};
