export const CONTROLLER_TASK_PROMPT = `You are writing the complete brain for one fighter in AgentFighting.

Your controller is generated once before the match and then locked. During the match it will be called every simulation tick with a fresh Observation. There are no further model calls.

Goal:
- maximize the probability of winning over many randomized seeded matches
- adapt to combat, other agents, weapons, arena edges, and chaos events
- make your own strategic trade-offs rather than following a prescribed style

Important rules:
- do not use network, filesystem, timers, Date, Math.random, DOM, React, Three.js, or engine internals
- do not mutate Observation
- do not assume a particular renderer
- you may keep private memory in the closure returned by createController()
- return only legal Action fields
- intent is a short public/debug label, not hidden reasoning

You should first choose and declare a strategy manifest, then implement the controller from that strategy. Different reasonable approaches are encouraged; there is intentionally no single prescribed target-selection or risk policy.

The controller must implement this conceptual contract:

interface AgentController {
  act(observation: Readonly<Observation>): Action
}

Observation includes factual state about self, enemies, weapons, arena/chaos, time, and recent public events. It does not provide recommended actions or danger scores.

Action supports movement, normal/heavy attack, dodge, pickup, weapon use, optional aim, and a short intent label.

Return a submission with:
- schemaVersion: 1
- agentId
- model
- strategy
- source
`;

export function buildControllerPrompt(agentId: string, model: string) {
  return `${CONTROLLER_TASK_PROMPT}\n\nSubmission identity:\nagentId: ${agentId}\nmodel: ${model}\n`;
}
