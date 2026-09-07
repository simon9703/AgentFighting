# AgentFighting

AgentFighting is a renderer-agnostic AI behavior arena with a **Three.js spectator presentation**. Multiple models generate one controller each, those controllers are locked before evaluation, and the same fixed code reacts to a changing shared world every simulation tick.

The project is not intended to be a serious model benchmark. Its value is in making agent behavior observable: strategy, mistakes, risk-taking, recovery, weapon choice, targeting, survival and emergent interaction.

## What exists today

AgentFighting already supports the full local evaluation loop:

```text
Controller submissions
        ↓
validate source + manifest
        ↓
create stable source/controller identities
        ↓
ControllerLock
        ↓
run many deterministic seeded matches
        ↓
authoritative WorldState + events + stats
        ↓
MatchRecord / replay / highlights
        ↓
Behavior Fingerprint
        ↓
Tournament artifact + Markdown report
```

The web app exposes two main product surfaces:

- `/` — live authoritative arena viewer with a Three.js game-style presentation
- `/tournament` — seeded tournament lab, behavior fingerprints, replay scrubbing, highlights and export

## Visual direction

The default live renderer now uses **Three.js** rather than a DOM/CSS pseudo-arena.

Current presentation features include:

- low-poly 3D fighters and arena geometry
- lighting, shadows and fog
- dynamic spectator camera
- camera shake for significant combat events
- 3D weapon pickups
- movement trails
- hit / weapon / stock-loss / elimination particles
- agent intent rings
- chaos-reactive arena lighting
- React HUD layered independently over WebGL

The visual target is a polished browser arcade/spectator experience: the 3D scene is the main product surface, while tactical data and evaluation evidence remain available in the HUD.

Three.js does **not** own simulation truth. It only consumes renderer-friendly immutable data derived from the engine.

## Architecture

```text
agents/
  built-in reference agents
  canonical sample submissions

features/controllers/
  generation prompt
  submission schema
  source validation
  stable controller/source identity
  trusted local compiler

features/sandbox/
  controller runtime boundary
  in-process runtime for trusted code
  async same-tick action collection
  browser Worker runtime for external code

features/engine/
  authoritative simulation
  observations and action sanitization
  movement / combat / weapons / stocks / chaos
  deterministic RNG
  match summary and tournament aggregation

features/replay/
  MatchRecord schema
  per-tick actions and snapshots
  deterministic replay verification
  highlight timeline

features/evaluation/
  ControllerLock
  submission tournament pipeline
  portable TournamentArtifact
  Markdown report generation

features/renderers/
  passive renderer-facing adapters/view models

features/arena/
  Three.js live viewport
  presentation-only particle/effect system
  React spectator HUD

features/tournament/
  Tournament Lab product UI
```

The dependency direction is deliberate: **presentation never owns match truth**.

## Core invariants

- every active controller observes the same pre-action snapshot for a tick
- all actions are collected before authoritative resolution
- controller outputs are sanitized
- engine randomness comes only from seeded RNG
- renderers cannot mutate combat, stocks, chaos or winner state
- a controller exception or timeout must not crash the match
- externally supplied controller code must not be treated as trusted local code
- controller identity is locked before seeded evaluation begins

## Controller contract

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

Controllers may keep private memory in their closure, but they do not call an LLM again during the match.

A model submission includes:

- `agentId`
- model name
- strategy manifest
- self-contained JavaScript controller source

The source receives stable hashes/identities so a replay can identify exactly which controller participated.

## Evaluation and replay

`evaluateControllerSubmissions()` is the trusted local end-to-end evaluation entry point. It validates submissions, creates a `ControllerLock`, runs the same participant set across many seeds, aggregates behavior fingerprints, and produces independently replayable `MatchRecord`s.

A portable tournament artifact contains:

- schema version
- controller lock and hashes
- original submissions and manifests
- tournament seeds/config
- match summaries
- behavior fingerprints
- replay records

Replay is simulation data, not recorded video. Live and replay presentation can therefore share the same Three.js primitives without changing engine behavior.

## Runtime safety

`compileTrustedControllerSource()` uses `new Function` only for trusted local development. It is **not a sandbox**.

For external controller code, the project has a browser Worker runtime and an asynchronous same-tick collection protocol with startup/per-tick timeout handling and neutral fallback actions. This is suitable for browser isolation and architecture validation, but it is not a hardened hostile multi-tenant sandbox.

A production public submission service still needs process/container isolation, hard resource quotas and server-side admission controls.

## Current game rules

The initial environment is a Smash/Fall-Guys-like arena:

- 4–8 agents
- stock-based survival
- movement, dodge, normal attack and heavy attack
- hammer, shield, push gun and bomb
- ice, wind, low gravity and shrinking arena events
- body collisions and knockback

The environment should continuously create trade-offs rather than one globally dominant strategy.

## Run

```bash
pnpm install
pnpm dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/tournament`

## Verify

```bash
pnpm check
```

This runs both TypeScript checking and the production Next.js build.

## Project status

The v1 authoritative engine/evaluation architecture is considered stable enough to freeze. New work should not add duplicate game rules or another evaluation path.

Current focus is **Three.js Presentation Phase 2**, followed by the submission/Worker/artifact path. See [`docs/PLAN.md`](./docs/PLAN.md) and [`docs/ROADMAP.md`](./docs/ROADMAP.md).

For architectural constraints and agent-facing development rules, see [`agent.md`](./agent.md) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
