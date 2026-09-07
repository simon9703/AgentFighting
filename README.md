# AgentFighting

AgentFighting is a renderer-agnostic AI behavior arena. Multiple models generate **one controller each**, controllers are locked before the match, and the same code reacts to a changing world every simulation tick.

The goal is not a serious benchmark. The interesting output is emergent behavior: strategy, mistakes, risk-taking, weapon choice, rivalries, recovery and chaos.

See [`agent.md`](./agent.md) for project goals and development rules.

## Core loop

```text
same task + same API
        ↓
Claude / Codex / Gemini / ...
        ↓
one generated controller each
        ↓
LOCK CODE
        ↓
Headless Arena Engine
        ↓
combat + weapons + collisions + seeded random events
        ↓
WorldState + events + stats + replay
        ↓
2D / 3D / replay renderer
```

## Architecture

```text
agents/
  sample/generated controllers

features/engine/
  authoritative headless simulation
  observations + actions
  deterministic RNG
  combat / weapons / stocks / chaos
  tournament + behavior metrics

features/controllers/
  canonical generation prompt
  strategy/submission schema
  source/controller identity

features/sandbox/
  ControllerRuntime abstraction
  trusted in-process adapter
  runtime wrapping + action recording

features/replay/
  replay schema
  deterministic match recorder
  recorded headless match runner

features/renderers/
  passive renderer contracts

features/arena/
  current 3D presentation prototype
```

The renderer is intentionally not authoritative. 2D Canvas, Pixi, Three.js or another presentation layer can replace the current 3D prototype without changing controller strategy or match rules.

## Important simulation rules

- every agent sees the same pre-action world snapshot for a tick
- all actions are collected before authoritative resolution
- controller outputs are sanitized
- engine randomness comes from a seeded RNG
- generated controller code should eventually run behind an isolated `ControllerRuntime`
- one controller failure must not crash the match

## Controller contract

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

Controllers may keep private memory in their closure but cannot call an LLM again during the match.

A model submission contains both a strategy manifest and source code. The source receives a stable identity/hash so a replay can say exactly which controller participated.

## Replay

A `MatchRecord` can contain:

- engine version
- seed + match config
- controller ids / source hashes
- initial world state
- sanitized actions per tick
- authoritative state snapshots
- public events
- final summary

This is simulation data rather than a video, so any renderer can replay or inspect it.

## Current game rules

Initial mode is a Smash/Fall-Guys-like physics brawl:

- 4–8 agents
- stock-based survival
- movement, dodge, normal attack, heavy attack
- hammer, shield, push gun, bomb
- ice, wind, low gravity, shrinking arena
- body interaction and knockback

The strategy space should intentionally contain trade-offs: attack, retreat, loot, hold center, chase weak opponents, avoid hazards, or exploit an edge opportunity.

## Run

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm typecheck
pnpm build
pnpm start
```

## Development priority

1. Headless authoritative engine
2. Controller strategy/API
3. Controller sandbox boundary
4. deterministic replay / match records
5. tournament + behavior fingerprint
6. real model-generated controller workflow
7. renderer integration
8. final visual polish
