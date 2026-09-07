# AgentFighting Architecture

## Architectural goal

AgentFighting separates **controller strategy**, **authoritative simulation**, **evaluation evidence**, and **presentation** so each can evolve independently.

The same controller set must be able to run:

- headlessly for batch tournaments,
- in the live arena viewer,
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
replay UI            Tournament Lab      Live Arena
```

The engine has no dependency on React, DOM, rendering libraries or tournament UI.

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

A public submission platform should add a process/container runtime with hard limits for:

- CPU time
- memory
- filesystem
- network
- process lifetime
- output size

The server runtime should implement the same logical controller protocol instead of modifying the engine.

## Determinism

A reproducible match is defined by:

```text
controller identities
+ engine version
+ ArenaConfig
+ seed
```

All authoritative randomness comes from the engine RNG. Renderer animation randomness may exist but cannot feed back into simulation state.

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

A single match is too noisy to characterize controller behavior. Tournament evaluation runs the same locked participant set across many seeds and aggregates:

- wins / win rate
- average rank
- combat stats
- movement stats
- weapon behavior
- behavior fingerprint dimensions

The current fingerprint dimensions are:

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
- filter events for presentation
- provide replay controls

A renderer may not:

- apply damage
- choose collision outcomes
- consume weapons authoritatively
- alter stocks
- create chaos events
- select the winner

## Current product surfaces

### Live Arena `/`

Consumes an authoritative `MatchSession` and presents a lightweight 2D/2.5D real-time view.

### Tournament Lab `/tournament`

Runs the local seeded evaluation workflow and presents:

- strategy manifests
- controller lock/hashes
- rankings
- behavior fingerprints
- per-seed replay scrubbing
- highlight navigation
- JSON artifact export
- Markdown report export

## Architecture freeze for v1

The following choices are considered settled for v1:

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

The next phase focuses on scale and product boundaries rather than rewriting the engine:

1. submission workspace and validation UI
2. Worker-backed execution for user-supplied browser submissions
3. tournament worker with progress/partial results
4. artifact import/persistence and stronger replay tooling
5. hardened server runtime design for public hostile submissions
6. renderer polish after the execution/evaluation path is stable

See `PLAN.md` for milestone-level tasks.
