import type { AgentDefinition, ControllerRuntime } from '@/features/engine';

export function wrapAgentsWithRuntime(
  agents: AgentDefinition[],
  runtime: ControllerRuntime,
): AgentDefinition[] {
  return agents.map((agent) => ({
    ...agent,
    createController() {
      const controller = agent.createController();
      return {
        act(observation) {
          return runtime.execute({ agentId: agent.id, controller, observation }) ?? {
            moveX: 0,
            moveZ: 0,
            intent: 'RUNTIME_FALLBACK',
          };
        },
      };
    },
  }));
}
