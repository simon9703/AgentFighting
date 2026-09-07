import type { Action, ControllerExecutionInput, ControllerRuntime } from '@/features/engine';

export interface InProcessRuntimeOptions {
  onError?: (error: unknown, input: ControllerExecutionInput) => void;
}

/**
 * Development-only runtime for trusted controllers already compiled into the app.
 *
 * This is intentionally NOT a security sandbox. Generated/untrusted source must
 * eventually run behind a Worker/process/VM implementation of ControllerRuntime.
 */
export function createInProcessRuntime(options: InProcessRuntimeOptions = {}): ControllerRuntime {
  return {
    execute(input): Action | null {
      try {
        return input.controller.act(input.observation);
      } catch (error) {
        options.onError?.(error, input);
        return null;
      }
    },
  };
}
