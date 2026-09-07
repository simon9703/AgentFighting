# AgentFighting

AgentFighting is a renderer-agnostic AI behavior arena. Multiple models generate **one controller each**, controllers are locked before the match, and the same fixed code reacts to a changing authoritative world every simulation tick.

The goal is not a serious model benchmark. The interesting output is emergent behavior: strategy, mistakes, risk-taking, weapon choice, rivalries, recovery and chaos.

See [`agent.md`](./agent.md) for project goals and development rules, and [`docs/ROADMAP.md`](./docs/ROADMAP.md) for implementation status.

## Product loop

```text
controller submissions + strategy manifests
        ↓
validate + source hash + ControllerLock
        ↓
reproducible seeded tournament
        ↓
authoritative headless engine
        ↓
combat + weapons + collisions + seeded chaos
        ↓
MatchRecord + Behavior Fingerprint + highlights
        ↓
live arena / replay inspector / JSON artifact / Markdown report
```

Open `/` for the live authoritative arena and `/tournament` for the complete seeded evaluation and replay workflow.

## Architecture

```text
agents/
  sample/generated controllers and canonical submissions

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
  trusted local source compiler

features/sandbox/
  trusted in-process runtime
  async same-tick runtime protocol
  browser Worker isolation primitive
  timeout termination + fallback

features/replay/
  replay schema + recorder
  deterministic replay verification
  compact highlight timeline

features/evaluation/
  ControllerLock
  seeded submission tournament
  portable JSON artifact
  human-readable Markdown report

features/renderers/
  passive MatchSession + renderer view-model

features/arena/
  authoritative 2.5D live presentation

features/tournament/
  Behavior Fingerprints
  replay scrubbing + highlight navigation
  artifact/report export
```

The renderer is intentionally not authoritative. Canvas, Pixi, Three.js, React Three Fiber or another presentation layer can replace the current first-version 2.5D UI without changing controller strategy or match rules.

## Fairness and determinism

- every active controller observes the same authoritative pre-action snapshot for tick N
- all actions are collected before world resolution produces tick N+1
- controller outputs are sanitized and invalid output becomes a neutral action
- authoritative randomness comes only from the seeded engine RNG
- source identities are locked before tournament evaluation starts
- one controller failure or timeout must not crash or stall the entire match
- replay data stores sanitized actions, authoritative state and public events rather than video

## Controller contract

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

Controllers may keep private memory in their closure but cannot call an LLM again during the match.

A submission contains a strategy manifest plus self-contained JavaScript source. `evaluateControllerSubmissions()` validates the submission set, creates a stable `ControllerLock`, runs the same locked controllers over many seeds, aggregates Behavior Fingerprints, records every match and bundles everything into a portable tournament artifact.

The local compiler remains explicitly trusted-development-only. Browser Worker runtime primitives now provide an isolated async execution boundary with startup/per-tick timeout handling. Truly arbitrary public source should still use a server process/container runtime with hard memory accounting.

## Tournament Lab

`/tournament` demonstrates the complete local/reproducible product loop:

- four deliberately different generated-style controller submissions
- immutable lock and source hashes
- five deterministic seeds
- win rate + average rank
- Behavior Fingerprint comparison
- authoritative tick-by-tick replay scrubber
- highlight navigation
- downloadable versioned JSON artifact
- downloadable Markdown post-match report

## Current arena rules

Initial mode is a chaotic platform brawl:

- 4–8 agents
- stock-based survival
- movement, dodge, normal attack, heavy attack
- hammer, shield, push gun, bomb
- ice, wind, low gravity, shrinking arena
- body interaction and knockback

The strategy space intentionally contains trade-offs: attack, retreat, loot, hold center, chase weak opponents, avoid hazards, or exploit an edge opportunity.

## Run

```bash
pnpm install
pnpm dev
```

Then open:

```text
/             live authoritative arena
/tournament   seeded evaluation + replay + export lab
```

## Build

```bash
pnpm typecheck
pnpm build
pnpm start
```
