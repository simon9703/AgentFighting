# AgentFighting

AI-controlled fighters enter the same dynamic arena with **one generated controller each**. The controller is locked before the match and is called every simulation step with the latest observation.

The goal is not a serious benchmark. The goal is to make model-generated behavior visible, chaotic and fun to watch.

## Current prototype

- Next.js 14 + React 18 + TypeScript + Tailwind
- React Three Fiber 3D floating arena
- 6 sample agents: Claude, Codex, Gemini, GPT, Qwen, DeepSeek
- one-shot `AgentController` API
- attack / heavy attack / dodge / edge recovery
- Smash-style damage + knockback
- 3-stock respawn rule
- body collisions between fighters
- chaos events: ice, wind, low-gravity, arena shrink
- weapon pickups: hammer, shield, push gun, bomb
- model-controlled pickup/use decisions
- hit flash, impact ring, camera shake and dynamic camera
- live intent, combat feed and per-agent stats
- post-match summary schema + review prompt builder

## Run

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Build

```bash
pnpm typecheck
pnpm build
pnpm start
```

The app follows the same Next/pnpm deployment direction as `AgentVisual` and is suitable for Vercel/Next deployment.

## Architecture

```text
agents/
  default-agents.ts        # sample one-shot generated controllers

features/arena/
  types.ts                 # Observation / Action / weapons / events / stats
  ArenaExperience.tsx      # world simulation + 3D presentation + HUD
  match-summary.ts         # post-match archive + model review prompt

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

A controller can keep internal memory, but it cannot call the model again during the match. The same controller sees a new observation every simulation step and reacts to fighters, weapons, arena state and recent events.

## Next milestones

1. Replace lightweight collision/knockback integration with Rapier rigid bodies.
2. Add authored melee animation states: wind-up, hit, recoil, dodge and KO.
3. Add projectile/bomb entities instead of instant weapon resolution.
4. Add deterministic match seeds and replay export.
5. Save each model controller + match archive under `matches/` for GitHub reproducibility.
6. Add real Claude/Codex/Gemini controller generation adapters.
