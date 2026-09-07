# AgentFighting

AI-controlled fighters enter the same dynamic arena with **one generated controller each**. The controller is locked before the match and is called every simulation step with the latest observation.

## MVP

- Next.js 14 + React 18 + TypeScript + Tailwind
- React Three Fiber 3D arena
- 6 sample agents: Claude, Codex, Gemini, GPT, Qwen, DeepSeek
- one-shot `AgentController` API
- attack / heavy attack / dodge / edge recovery
- 3-stock respawn rule
- dynamic chaos events: ice, wind, low-gravity placeholder, arena shrink
- live combat feed and per-agent stats

## Run

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Build

```bash
pnpm build
pnpm start
```

The app uses the same Next/pnpm deployment direction as `AgentVisual` and is suitable for Vercel/Next deployment.

## Architecture

```text
agents/
  default-agents.ts        # sample one-shot generated controllers

features/arena/
  types.ts                 # Observation / Action / Controller / events / stats
  ArenaExperience.tsx      # world simulation + 3D presentation + HUD

app/
  page.tsx
  layout.tsx
  globals.css
```

The intended model-generated artifact is an implementation of:

```ts
interface AgentController {
  act(observation: Observation): Action
}
```

Later iterations will replace the lightweight body simulation with Rapier rigid bodies, add melee animations, weapons, particles, replay export, and model-specific generated controller files.
