# AgentFighting Architecture

## Architectural goal

AgentFighting separates **controller strategy**, **authoritative simulation**, **evaluation evidence**, and **presentation** so each can evolve independently.

The same controller set must be able to run:

- headlessly for batch tournaments,
- in the live Three.js arena viewer,
- in replay mode from recorded match data,
- in future renderers without changing match rules.

## Dependency direction

```text
ControllerSubmission
        ↓
controllers / sandbox
        ↓
AgentController contract
        ↓
+------------------------+
| Authoritative Engine   |
| state + rules + RNG    |
+------------------------+
        ↓
WorldState / MatchSummary / TickRecord
        ↓
+----------------+----------------+----------------+
| replay         | evaluation     | renderers      |
| MatchRecord    | tournament     | view models    |
| verification   | fingerprints   | MatchSession   |
+----------------+----------------+----------------+
        ↓                 ↓                ↓
replay UI            Tournament Lab      presentation
                                           ↓
                              Three.js scene + ArenaFx
                                           ↓
                                      React HUD
```

The engine has no dependency on React, DOM, WebGL, Three.js or tournament UI.

## Authoritative tick model

Each tick follows one logical transaction:

```text
1. advance authoritative timers/events
2. produce observations from state N
3. collect every active controller action from state N
4. sanitize every action
5. resolve actions against the authoritative world
6. integrate movement / combat / weapons / collisions
7. resolve stocks / respawns / elimination / winner
8. emit events and tick record
9. expose state N+1
```

The critical invariant is that controller execution order must not create information advantage.

## Controller identity and locking

Before a seeded evaluation begins, every submission receives stable identity data derived from its content.

```text
submission source
      ↓
sourceHash
      ↓
controllerId
      ↓
ControllerLock
```

`ControllerLock` records the exact participants, model labels, strategy labels and source hashes used by the tournament. The lock itself has a stable `lockHash` that excludes wall-clock metadata.

Once locked, controller source must not change during the tournament.

## Runtime boundary

There are intentionally two execution paths.

### Trusted local path

`compileTrustedControllerSource()` compiles built-in/sample source for local evaluation.

This path uses `new Function`. It is convenient but **not a security sandbox**.

### External browser path

The browser Worker runtime isolates controller execution from the UI thread and supports:

- startup timeout
- per-tick timeout
- termination on timeout/failure
- same-tick asynchronous action collection
- neutral fallback actions

This improves fault isolation but is not enough for hostile public multi-tenant execution.

### Future server path

A public submission platform should add a process/container runtime with hard limits for CPU time, memory, filesystem, network, process lifetime and output size.

The server runtime should implement the same logical controller protocol instead of modifying the engine.

## Determinism

A reproducible match is defined by:

```text
controller identities
+ engine version
+ ArenaConfig
+ seed
```

All authoritative randomness comes from the engine RNG. Renderer animation/particle randomness may exist but cannot feed back into simulation state.

## Replay model

Replay is structured simulation evidence, not video.

`MatchRecord` contains enough data to inspect a match without rerunning model inference:

- engine/schema version
- seed/config
- controller descriptors
- initial state
- sanitized actions per tick
- authoritative state snapshots
- public events
- final summary

Action-only replay verification can rerun the authoritative engine and compare results, while snapshot playback can support scrubbing and debugging.

## Tournament evaluation

A single match is too noisy to characterize controller behavior. Tournament evaluation runs the same locked participant set across many seeds and aggregates wins, average rank, combat stats, movement stats, weapon behavior and behavior fingerprints.

Current fingerprint dimensions:

```text
aggression
accuracy
weaponUsage
edgeRisk
mobility
survival
```

These are descriptive signals, not an overall model score.

## Portable artifacts

`TournamentArtifact` is the versioned evidence bundle for one evaluation set.

It contains:

```text
ControllerLock
ControllerSubmissions
TournamentResult
MatchRecords
```

A Markdown report is derived from the artifact. Reports and UI are views over artifact data; they are not authoritative sources.

## Renderer boundary

Renderers receive immutable engine data through passive adapters such as `MatchSession` and `ArenaViewModel`.

A renderer may:

- interpolate positions
- animate attacks and impacts
- choose camera/layout
- render weapons from authoritative weapon state
- map public events to particles and transient effects
- visualize short controller `intent` labels
- filter events for presentation
- provide replay controls

A renderer may not:

- apply damage
- choose collision outcomes
- consume weapons authoritatively
- alter stocks
- create chaos events
- select the winner
- feed presentation state back into simulation

## Three.js presentation architecture

Three.js is the default live renderer, but remains downstream of renderer-neutral data.

```text
WorldState + public events
        ↓
createArenaViewModel()
        ↓
ThreeArenaViewport
   ├─ scene / lighting / arena geometry
   ├─ fighter visuals
   ├─ weapon visuals
   ├─ camera framing
   └─ ArenaFx
        ↓
WebGL output

React HUD consumes the same ArenaViewModel in parallel.
```

### `ThreeArenaViewport`

Responsible for long-lived scene objects and interpolation:

- fighters
- weapon pickups
- arena geometry
- lighting/fog
- spectator camera
- chaos presentation state

It may interpolate from one engine snapshot to another but does not create authoritative motion.

### `ArenaFx`

`ArenaFx` owns short-lived presentation-only effects:

- particle bursts
- movement trails
- event rings
- future attack/projectile/hazard visuals

Effects are spawned from authoritative events or observable renderer data. Their random spread/lifetime is decorative only.

### Future camera director

Camera behavior should be extracted from `ThreeArenaViewport` when complexity grows. A camera director may select overview, combat-focus, KO emphasis and replay-highlight shots using observable state/events only.

### Future post-processing

Bloom, vignette, hit flash or other post-processing belongs entirely in presentation. Post FX must remain optional and should support quality tiers for mobile devices.

## Current product surfaces

### Live Arena `/`

Consumes an authoritative `MatchSession` and presents:

- Three.js 3D arena
- animated fighter/weapon visuals
- particles and event effects
- dynamic spectator camera
- game-style React HUD
- live event stream and match controls

### Tournament Lab `/tournament`

Runs the local seeded evaluation workflow and presents strategy manifests, controller lock/hashes, rankings, behavior fingerprints, per-seed replay scrubbing, highlight navigation and artifact/report export.

The replay surface should progressively converge on the same Three.js presentation primitives used by live matches.

## Architecture freeze for v1

The following choices are settled:

- one authoritative headless engine
- renderer-agnostic rules
- same-tick observation/action semantics
- deterministic engine RNG
- controller submission schema
- pre-evaluation controller locking
- versioned replay/tournament artifacts
- trusted versus external runtime separation

Do not introduce a parallel engine, replay format or tournament pipeline to ship a feature faster.

## Next architecture work

Current order:

1. finish Three.js Presentation Phase 2 readability
2. submission workspace and validation UI
3. Worker-backed execution for user-supplied browser submissions
4. tournament worker with progress/partial results
5. artifact import/persistence and Three.js replay parity
6. shared camera director and optional post-FX pipeline
7. hardened server runtime design for public hostile submissions

See `PLAN.md` for milestone-level tasks.
