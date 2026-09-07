# AgentFighting v2 Plan

## Theme

**Submission Platform + Scalable Evaluation + Presentation Polish**

v1 proved the architecture and local tournament loop. v2 should make that loop usable for real user-supplied controllers without weakening determinism, fairness or renderer separation.

## Milestone 1 — Controller Submission Workspace

### Goal

Let a user create or paste a complete `ControllerSubmission`, validate it before execution, and understand exactly what will be locked.

### Work

- Add `/submit` or a submission panel inside Tournament Lab.
- Editable fields:
  - agent id
  - model label
  - strategy manifest
  - JavaScript source
- Parse through the canonical Zod schema.
- Run source policy validation before execution.
- Show violations with rule/message and source context where practical.
- Preview `sourceHash`, `controllerId` and strategy metadata.
- Support adding/removing multiple participant submissions.
- Provide sample templates as starting points.
- Do not auto-edit source after the user chooses to lock it.

### Acceptance criteria

- invalid submissions cannot enter a tournament
- users can see why validation failed
- the exact source being locked is visible
- two identical sources generate stable identities
- tournament participants are derived from submitted/locked data, not hidden defaults

## Milestone 2 — Worker-backed External Execution

### Goal

Make the browser tournament path execute user-supplied controller source through the Worker runtime rather than the trusted local compiler.

### Work

- Define a browser evaluation coordinator around the existing async runtime protocol.
- Start one isolated worker/runtime per controller or a clearly documented equivalent isolation model.
- Build observations from one immutable tick state.
- Dispatch all controller decisions concurrently.
- Apply per-tick timeout/fallback rules.
- Preserve authoritative resolution order in the engine.
- Record timeout/failure diagnostics as non-authoritative runtime metadata.
- Keep sample/trusted evaluation available for tests and local development.

### Acceptance criteria

- user source never executes through `compileTrustedControllerSource()`
- one timed-out worker cannot stall the match
- one failed worker cannot crash another participant
- all controllers still decide from the same tick snapshot
- replay records remain deterministic with the accepted actions

## Milestone 3 — Tournament Worker and Progress Streaming

### Goal

Run long multi-seed tournaments without blocking the UI.

### Work

- Move tournament orchestration into a dedicated Worker.
- Support configurable seed lists/ranges.
- Emit progress events:
  - queued
  - running match N/M
  - partial aggregate
  - completed
  - failed/cancelled
- Allow user cancellation.
- Update rankings/fingerprints incrementally where safe.
- Avoid storing unnecessary duplicate state in the UI thread.

### Acceptance criteria

- 50–100 seed runs do not freeze the page
- progress is visible
- cancellation terminates background work
- final artifact is identical in schema to synchronous trusted evaluation

## Milestone 4 — Artifact Import, Persistence and Replay UX

### Goal

Make tournament evidence reusable after the page/session ends.

### Work

- Add `TournamentArtifact` parser/validator.
- Import JSON artifact from file.
- Open imported artifacts directly in replay/tournament inspection mode.
- Add local persistence using IndexedDB or a small storage adapter.
- Define a storage interface that can later be backed by a server.
- Improve replay controls:
  - play/pause
  - speed
  - jump to event
  - next/previous highlight
  - event filters
  - selected fighter focus
- Add share/export metadata without making presentation data authoritative.

### Acceptance criteria

- exported artifact can be imported into a fresh browser session
- imported artifact produces the same rankings/replay data
- replay can be navigated without rerunning controllers

## Milestone 5 — Production Sandbox Architecture

### Goal

Design the path for accepting hostile public submissions safely.

### Work

- Specify a server runtime protocol compatible with the controller action contract.
- Evaluate process/container/VM isolation options.
- Define quotas for:
  - startup CPU/time
  - per-tick CPU/time
  - memory
  - output size
  - filesystem
  - network
- Add admission validation and source-size limits.
- Define runtime crash/timeout telemetry.
- Keep authoritative engine execution separate from sandbox implementation details.

### Acceptance criteria

- architecture document clearly distinguishes browser isolation from hostile multi-tenant isolation
- no public deployment claims `new Function` or browser Worker alone is a secure sandbox
- resource limits and fallback semantics are explicit

## Milestone 6 — Combat Readability and Visual Polish

### Goal

Make matches easier and more entertaining to watch without moving rules into the renderer.

### Work

Derive effects from authoritative state/events:

```text
attack event/state
→ anticipation/trail
→ hit event
→ impact flash
→ knockback streak

stock-lost / eliminated
→ arena pulse
→ elimination effect
→ scoreboard emphasis

chaos event
→ environment transition

weapon pickup/use
→ pickup/use effect
```

Also improve:

- selected fighter focus
- intent readability
- event feed hierarchy
- mobile layout
- match-end presentation
- replay/live visual consistency

### Acceptance criteria

- renderer effects are entirely derived from immutable state/events
- no combat outcome is decided by animation code
- major events are understandable without reading raw logs

## Milestone 7 — New Modes and Renderers

Only begin after milestones 1–4 are stable.

Possible work:

- alternative arena layouts
- team mode
- objective/control-point mode
- richer 2D/Pixi renderer
- optional 3D renderer
- spectator camera modes

Any new mode should first prove that it creates meaningful controller trade-offs.

## Explicit non-goals for the next phase

Do not prioritize these before the platform path works:

- large weapon catalogs
- cosmetic skins
- many maps with identical strategy
- model leaderboard claims
- real-time LLM calls during a match
- renderer-specific physics rules
- rewriting the engine in another framework

## Recommended implementation order

```text
1. Submission Workspace
2. External Worker evaluation path
3. Tournament Worker
4. Artifact import + replay persistence
5. Production sandbox design
6. Visual polish
7. New modes/renderers
```

## v2 success condition

A user should be able to:

```text
paste/import several AI-generated controllers
        ↓
validate and understand failures
        ↓
lock exact identities
        ↓
run a non-blocking seeded tournament
        ↓
watch progress and results
        ↓
inspect behavior + replay + highlights
        ↓
export the evidence
        ↓
reload/import it later without rerunning the controllers
```

When that works cleanly, AgentFighting becomes a controller experimentation platform rather than only a local showcase.
