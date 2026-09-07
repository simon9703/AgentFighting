# AgentFighting

AgentFighting is a renderer-agnostic AI behavior arena with a **Three.js spectator presentation**. Multiple models generate one fixed controller each, those exact submissions are validated and locked before evaluation, and every controller reacts to the same changing authoritative world.

It is not intended to be a serious model benchmark. Its value is making autonomous behavior observable and replayable: strategy, mistakes, risk-taking, recovery, targeting, weapon choice, survival, runtime reliability and emergent interaction.

## Product loop

```text
/edit controller submissions at /submit
        ↓
Zod schema + source-policy validation
        ↓
sourceHash / controllerId / ControllerLock
        ↓
Tournament Worker
        ↓
1 isolated Controller Worker per agent
        ↓
engine.prepareTick()
        ↓
same immutable observations → concurrent actions
        ↓
engine.resolvePreparedTick(all accepted actions)
        ↓
MatchRecord + behavior aggregate
        ↓
portable TournamentArtifact
        ↓
IndexedDB / JSON export-import
        ↓
Three.js replay + highlights + fighter focus
```

The trusted built-in path and the Worker-backed external path share the **same authoritative engine resolution**; there is no second browser-game simulation.

## Web surfaces

- `/` — live authoritative arena with adaptive Three.js rendering, camera direction, FX and optional event-driven SFX
- `/submit` — controller editor, validation/identity inspection, exact-submission lock, seed presets/ranges, Worker tournament progress and runtime diagnostics
- `/tournament` — aggregate behavior fingerprints, artifact import/export/persistence and authoritative Three.js replay

## Three.js presentation

The default visual implementation is Three.js, inspired by polished browser arcade presentation rather than dashboard UI.

Current presentation includes:

- low-poly 3D fighters, weapons and arena geometry
- lighting, fog and quality-dependent shadows
- movement trails, particles, attack/heavy arcs, dodge and shield effects
- weapon tracer/target-link feedback
- `CameraDirector` overview/combat/KO/fighter-focus modes
- `ArenaPostFX` bloom, vignette, hit flash and restrained distortion
- chaos-reactive environment treatment
- short public controller `intent` and movement-direction visualization
- shared live/replay `ThreeArenaViewport`
- responsive React HUD over WebGL
- automatic conservative quality selection on narrow/low-resource/reduced-motion clients
- optional procedural SFX driven only by public match events

Three.js, camera, particles, post-processing and audio never decide damage, collision, stocks, weapons, chaos or winner state.

## Architecture

```text
agents/
  reference agents + sample submissions

features/controllers/
  submission/strategy schema
  source policy
  stable source/controller identity
  trusted local compiler

features/sandbox/
  runtime interfaces
  same-tick async action collection
  browser Controller Worker runtime

features/engine/
  authoritative simulation
  prepareTick / resolvePreparedTick
  observation + action sanitization
  movement / combat / weapons / stocks / chaos
  deterministic RNG
  summary + tournament aggregation

features/replay/
  MatchRecord
  accepted per-tick actions + snapshots
  deterministic verification
  highlights

features/evaluation/
  ControllerLock
  trusted evaluation
  Worker-backed browser evaluation
  dedicated Tournament Worker client
  TournamentArtifact import/export
  IndexedDB artifact storage
  reports + runtime diagnostics

features/renderers/
  passive renderer-facing adapters/view models

features/arena/
  Three.js viewport
  ArenaFx / ArenaPostFX / CameraDirector / ArenaAudio
  live spectator HUD

features/submission/
  Submission Workspace

features/tournament/
  Tournament Lab + Three.js replay
```

Dependency direction is deliberate: **presentation and controller runtimes never own match truth**.

## Core invariants

- every active controller observes the same prepared tick snapshot
- all controller actions are collected before authoritative resolution
- every output is sanitized before engine use
- engine randomness comes only from seeded RNG
- renderers/audio cannot mutate match state
- one controller timeout/crash cannot crash the match
- external source never silently routes through the trusted local compiler
- exact controller identity is locked before seeded evaluation
- replay/artifact evidence records accepted authoritative actions/state, not renderer animation

## Controller contract

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

Controllers may keep private memory inside their runtime for one match. They do not call an LLM again during combat. `intent` is a short public/debug label, never hidden chain-of-thought.

## External browser evaluation

The asynchronous authoritative tick flow is:

```text
prepareTick()
    ↓
Observation N for A/B/C/D
    ↓
Controller Workers execute concurrently with deadline
    ↓
timeout/error → neutral sanitized fallback
    ↓
resolvePreparedTick(actions)
    ↓
state N+1
```

A dedicated Tournament Worker runs multi-seed evaluation away from the React UI thread. The Submission Workspace supports comma-separated seeds, ranges such as `1-50`, presets up to 100 seeds, cancellation, progress, partial aggregates, timeout/failure counts and decision-latency diagnostics.

Browser Workers provide fault isolation only. They are **not** a hardened hostile multi-tenant security sandbox. See [`docs/SANDBOX.md`](./docs/SANDBOX.md) for the production process/container/microVM design and deployment gate.

## Evidence and replay

A portable `TournamentArtifact` contains:

- schema version
- exact ControllerLock and hashes
- original submissions/manifests
- seeds/config
- match summaries
- behavior fingerprints
- authoritative replay records

Tournament Lab can export JSON, import/validate it in a fresh session, persist it in IndexedDB, reopen recent evidence and inspect it using the same Three.js presentation without rerunning controllers.

## Current game rules

The initial environment is a Smash/Fall-Guys-like arena:

- 4–8 agents
- stock-based survival
- movement, dodge, normal attack and heavy attack
- hammer, shield, push gun and bomb
- ice, wind, low gravity and shrinking-arena events
- body collisions and knockback

Mechanics should create recurring trade-offs rather than one globally dominant policy.

## Run

```bash
pnpm install
pnpm dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/submit`
- `http://localhost:3000/tournament`

## Verify

```bash
pnpm check
```

This runs TypeScript checking and a production Next.js build.

## Project status

The authoritative engine/evaluation boundary and Three.js presentation foundation are established. Submission editing, browser Worker evaluation, Tournament Worker orchestration, artifact persistence/import and live/replay presentation are implemented.

Current work is **hardening**, not another rewrite: browser load benchmarking, deeper artifact validation/storage management, accessibility/audio polish, strategic arena experiments and eventually a hardened server sandbox before public hostile arbitrary-code execution.

See [`docs/PLAN.md`](./docs/PLAN.md), [`docs/ROADMAP.md`](./docs/ROADMAP.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/SANDBOX.md`](./docs/SANDBOX.md) and [`agent.md`](./agent.md).
