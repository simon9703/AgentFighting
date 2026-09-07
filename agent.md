# AgentFighting — Agent Development Guide

## Mission

AgentFighting is an AI behavior arena first and a fighting-game presentation second.

Its defining loop is:

```text
same task + same API
        ↓
multiple models generate one controller each
        ↓
submission manifest + source are validated
        ↓
controller/source identities are locked
        ↓
fixed controllers act in the same dynamic world
        ↓
all actions are collected from the same tick snapshot
        ↓
authoritative simulation resolves the world
        ↓
replay + behavior data + tournament artifact
```

The project is not a serious model benchmark. The interesting output is behavioral diversity: emergent strategies, mistakes, rivalries, risk-taking, recovery, weapon choices and adaptation to shared chaos.

## Non-negotiable invariants

### 1. One-shot controller generation

- A model generates controller code before evaluation.
- No LLM calls are required during the match.
- The controller may keep private state in its closure.
- The controller source is immutable once included in a `ControllerLock`.

### 2. Authoritative engine only

There must be exactly one source of match truth: `features/engine/`.

Do not implement damage, collision outcomes, stocks, respawn, chaos, winner selection or weapon rules inside React components, renderers, replay UI or controller adapters.

### 3. Same-tick fairness

For tick N:

```text
freeze/read authoritative state N
        ↓
build observations for every active controller
        ↓
collect every action
        ↓
sanitize actions
        ↓
resolve all actions into state N+1
```

Never let controller B observe controller A's already-applied action from the same tick.

### 4. Determinism where practical

- Authoritative randomness comes only from the seeded engine RNG.
- Do not use `Math.random()` inside engine rules.
- A match identity is derived from controller identities + engine version + config + seed.
- Presentation-only animation randomness is allowed if it cannot affect simulation state.

### 5. Facts, not strategy hints

`Observation` should expose world facts, not conclusions.

Good:

- positions / velocities
- damage / stocks
- distance to edge
- weapons and availability
- arena state / chaos
- recent public events

Bad:

- `bestTarget`
- `dangerScore`
- `safeDirection`
- `recommendedAction`

Those decisions belong to the controller.

### 6. Renderer is passive and replaceable

Current product rendering is 2D/2.5D, but the engine must remain usable by Canvas, Pixi, Three.js, native or replay-only renderers.

Renderer code may interpolate or animate snapshots. It may not mutate match truth.

### 7. Headless execution remains first-class

The engine and evaluation pipeline must run without React, DOM, Canvas or WebGL. Batch evaluation over many seeds must not depend on the visual app.

## Current architecture

```text
agents/
  reference AgentDefinitions
  sample ControllerSubmissions

features/controllers/
  canonical generation prompt
  submission/strategy schema
  source policy
  source/controller identity
  trusted local compiler

features/sandbox/
  runtime boundary
  trusted in-process adapter
  async same-tick action collection
  browser Worker runtime

features/engine/
  authoritative state and rules
  observation creation
  action sanitization
  deterministic RNG
  match/tournament statistics

features/replay/
  MatchRecord
  per-tick actions/snapshots/events
  deterministic verification
  highlight timeline

features/evaluation/
  ControllerLock
  submission evaluation pipeline
  TournamentArtifact
  human-readable report generation

features/renderers/
  passive MatchSession and ArenaViewModel adapters

features/arena/
  live arena UI only

features/tournament/
  Tournament Lab UI only
```

Dependency direction should remain:

```text
controllers → engine contracts
sandbox → controller/engine contracts
engine → no UI dependency
replay/evaluation → engine data
renderers → engine data
UI → renderers/evaluation/replay
```

## Controller contract

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

The action surface should remain compact and expressive:

- `moveX` / `moveZ`
- `attack`
- `heavyAttack`
- `dodge`
- `pickup`
- `useWeapon`
- `aimX` / `aimZ`
- optional short `intent`

`intent` is a debug/UI label, never chain-of-thought.

## Controller safety

Every controller output must be sanitized before resolution.

Required safeguards:

- clamp numeric ranges
- reject NaN/Infinity
- default missing fields
- catch controller exceptions
- neutral fallback action on failure
- startup/per-tick timeout in isolated runtimes
- terminate timed-out workers
- one bad controller must not crash a match

### Trusted versus external source

`compileTrustedControllerSource()` is only for trusted local/sample code. It uses `new Function` and is not a security boundary.

External source should use the Worker runtime in browser contexts. A future public multi-tenant service must use stronger server-side process/container isolation with CPU, memory, filesystem and network restrictions.

Do not silently route untrusted source through the trusted compiler.

## Replay and tournament records

A replayable `MatchRecord` should remain sufficient to inspect the complete authoritative match:

- schema version
- engine version
- seed/config
- controller descriptors/hashes
- initial state
- sanitized per-tick actions
- authoritative per-tick state
- public events
- final summary

A `TournamentArtifact` should bundle the evaluation evidence needed to reproduce or audit a run:

- `ControllerLock`
- original submissions/manifests
- seeds/config
- tournament aggregates
- behavior fingerprints
- replay records

Artifact schemas should be versioned. Do not make renderer-specific data authoritative.

## Behavior evaluation

Do not infer a controller's style from a single match.

Aggregate many seeds and prefer multidimensional fingerprints over one score. Existing dimensions include:

- aggression
- accuracy
- weapon usage
- edge risk
- mobility
- survival

Future metrics are welcome when they describe observable behavior rather than encode an optimal strategy.

## Game design rules

The arena should create recurring trade-offs:

```text
finish damaged opponent
vs
recover from edge
vs
pick up weapon
vs
hold center
vs
avoid chaos
vs
escape a crowded fight
```

Avoid adding mechanics when one simple policy obviously dominates them. New mechanics should increase behavioral differentiation or spectating value.

## v1 status

The following are considered established and should not be reimplemented in parallel:

- authoritative headless engine
- deterministic seeded matches
- same-tick action collection semantics
- controller submission schema and identities
- trusted local evaluation pipeline
- controller locking
- tournament aggregation and behavior fingerprints
- replay records and deterministic verification
- highlight extraction
- portable tournament artifacts and reports
- live authoritative arena UI
- tournament/replay UI
- browser Worker runtime primitives

## Next-phase development order

See `docs/PLAN.md` for detailed milestones. The high-level priority is:

1. real Controller Submission UI and validation experience
2. route external submissions through Worker-backed execution
3. move long tournaments off the main UI thread with progress streaming
4. strengthen persistence/import/export and replay ergonomics
5. improve combat readability and visual effects without moving rules into presentation
6. only after those are stable, consider new arenas, game modes or a richer 3D renderer

## Definition of done for changes

Before merging a meaningful change:

- `pnpm typecheck` passes
- `pnpm build` passes
- no renderer-owned game rules are introduced
- no duplicate controller/evaluation pipeline is introduced
- docs are updated when architecture/contracts change
- exported schemas are versioned when compatibility changes

When choosing between a flashy feature and preserving the dependency boundary, preserve the boundary.
