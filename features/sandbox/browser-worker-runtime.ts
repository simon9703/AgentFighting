import type { Action, AgentId, Observation } from '@/features/engine';
import { validateControllerSource } from '@/features/controllers/source-policy';
import type { AsyncControllerRuntime } from './async-runtime';

const WORKER_BOOT = `
let controller = null;
self.onmessage = async (event) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      const create = new Function('"use strict";\\n' + message.source + '\\n; return createController;')();
      controller = create();
      if (!controller || typeof controller.act !== 'function') throw new Error('Invalid controller factory');
      self.postMessage({ type: 'ready' });
      return;
    }
    if (message.type === 'act') {
      if (!controller) throw new Error('Controller not initialized');
      const action = controller.act(message.observation);
      self.postMessage({ type: 'action', requestId: message.requestId, action });
    }
  } catch (error) {
    self.postMessage({ type: 'error', requestId: message.requestId, message: error && error.message ? error.message : String(error) });
  }
};
`;

export interface BrowserWorkerRuntimeOptions {
  startupTimeoutMs?: number;
}

/**
 * Browser isolation boundary for controller code. It is intentionally separate
 * from trusted in-process compilation. A production public service should still
 * prefer a server-side process/container boundary when strict memory accounting
 * and stronger anti-evasion guarantees are required.
 */
export class BrowserWorkerControllerRuntime implements AsyncControllerRuntime {
  private worker: Worker | null = null;
  private nextRequestId = 0;
  private pending = new Map<number, { resolve(value: Action | null): void; reject(error: Error): void }>();
  private ready: Promise<void> | null = null;

  constructor(private readonly source: string, private readonly options: BrowserWorkerRuntimeOptions = {}) {
    const violations = validateControllerSource(source);
    if (violations.length) throw new Error(violations.map((item) => item.message).join(' '));
  }

  start(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      const blob = new Blob([WORKER_BOOT], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url, { name: 'agent-fighting-controller' });
      URL.revokeObjectURL(url);
      this.worker = worker;
      const timer = window.setTimeout(() => {
        worker.terminate();
        reject(new Error('Controller worker startup timed out'));
      }, this.options.startupTimeoutMs ?? 1000);
      worker.onmessage = (event: MessageEvent) => {
        const message = event.data as { type: string; requestId?: number; action?: Action; message?: string };
        if (message.type === 'ready') {
          window.clearTimeout(timer);
          resolve();
          return;
        }
        if (typeof message.requestId === 'number') {
          const request = this.pending.get(message.requestId);
          if (!request) return;
          this.pending.delete(message.requestId);
          if (message.type === 'error') request.reject(new Error(message.message ?? 'Controller worker failed'));
          else request.resolve(message.action ?? null);
        }
      };
      worker.onerror = () => reject(new Error('Controller worker crashed'));
      worker.postMessage({ type: 'init', source: this.source });
    });
    return this.ready;
  }

  async execute(_agentId: AgentId, observation: Readonly<Observation>): Promise<Action | null> {
    await this.start();
    if (!this.worker) return null;
    const requestId = ++this.nextRequestId;
    return new Promise<Action | null>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker!.postMessage({ type: 'act', requestId, observation });
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    for (const request of this.pending.values()) request.reject(new Error('Controller worker disposed'));
    this.pending.clear();
  }
}
