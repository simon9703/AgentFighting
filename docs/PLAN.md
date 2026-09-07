# AgentFighting v2 Plan

## Theme

**Submission Platform + Scalable Evaluation + Spectator-Grade Three.js Presentation**

v1 proved the authoritative architecture and local tournament loop. v2 turns that loop into a usable controller experimentation platform while making behavior visibly understandable and entertaining to watch.

Three.js is now the default product presentation, while the engine, tournament pipeline and replay format remain renderer-agnostic.

## Presentation Phase 2 — Completed

The current visual upgrade is considered complete enough to move the primary focus back to the platform path.

### Delivered

- Three.js live arena replaces the old DOM/CSS pseudo-arena.
- Low-poly fighters, weapons, arena geometry, lighting, shadows and fog.
- Dedicated presentation-only `ArenaFx` system.
- Fast movement trails and combat bursts.
- Attack arcs from observable intent changes.
- Heavy attack visual emphasis.
- Dodge burst/trail.
- Shield field effect.
- Weapon-use beam/tracer and target link.
- Bomb-specific visual emphasis from public weapon-use detail.
- Hit / stock loss / elimination escalation.
- `CameraDirector` with overview, combat, KO and selected-fighter focus modes.
- Auto framing based on active fighter spread.
- Live fighter follow mode from the contender cards.
- `ArenaPostFX` with subtle bloom, vignette, hit flash and restrained energy/chromatic distortion.
- Chaos-reactive arena color, light, exposure and post FX.
- High/low quality renderer hooks.
- Tactical direction line based on observable movement/facing data.
- Controller short `intent` visualization without exposing chain-of-thought.
- Tournament replay now reuses the same `ThreeArenaViewport` as live matches.
- Replay play/pause, speed controls, scrubber, highlights and per-fighter camera focus.

### Presentation architecture

```text
authoritative WorldState / replay snapshot
        ↓
createArenaViewModel()
        ↓
ThreeArenaViewport
   ├─ scene / fighters / weapons
   ├─ ArenaFx
   ├─ CameraDirector
   └─ ArenaPostFX
        ↓
WebGL

React HUD / replay controls consume the same renderer-neutral data in parallel.
```

### Invariants

- particles, camera, interpolation and post FX are presentation only
- no Three.js code decides damage, collision, stocks, weapon outcomes, chaos or winner state
- replay and live presentation consume authoritative snapshots rather than separate game logic
- controller `intent` is a short public/debug label, never hidden reasoning

## Current focus — Milestone 1: Controller Submission Workspace

### Goal

Let a user create or paste complete `ControllerSubmission`s, validate them before execution, and understand exactly what will be locked.

### Work

- Add `/submit` or a submission workspace inside Tournament Lab.
- Editable fields: agent id, model label, strategy manifest and JavaScript source.
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
- tournament participants come from submitted/locked data, not hidden defaults

## Milestone 2 — Worker-backed External Execution

### Goal

Make the browser tournament path execute user-supplied controller source through the Worker runtime rather than the trusted local compiler.

### Work

- Define a browser evaluation coordinator around the existing async runtime protocol.
- Start one isolated worker/runtime per controller or a documented equivalent isolation model.
- Build observations from one immutable tick state.
- Dispatch controller decisions concurrently.
- Apply per-tick timeout/fallback rules.
- Preserve authoritative resolution order in the engine.
- Record timeout/failure diagnostics as non-authoritative runtime metadata.
- Keep trusted sample evaluation available for tests/local development.

### Acceptance criteria

- user source never executes through `compileTrustedControllerSource()`
- one timed-out worker cannot stall the match
- one failed worker cannot crash another participant
- all controllers decide from the same tick snapshot
- replay records remain deterministic with accepted actions

## Milestone 3 — Tournament Worker and Progress Streaming

### Goal

Run long multi-seed tournaments without blocking the UI.

### Work

- Move tournament orchestration into a dedicated Worker.
- Support configurable seed lists/ranges.
- Emit queued/running/partial/completed/failed/cancelled progress events.
- Allow cancellation.
- Update rankings/fingerprints incrementally where safe.
- Avoid unnecessary duplicate state in the UI thread.

### Acceptance criteria

- 50–100 seed runs do not freeze the page
- progress is visible
- cancellation terminates background work
- final artifact matches the synchronous trusted schema

## Milestone 4 — Artifact Import, Persistence and Replay UX

### Goal

Make tournament evidence reusable after the page/session ends.

### Already completed

- Three.js replay parity with the live renderer.
- Replay play/pause.
- Replay speed controls.
- Highlight jump navigation.
- Selected-fighter focus camera.
- Seed switching and scrubber.

### Remaining work

- Add `TournamentArtifact` parser/validator.
- Import JSON artifact from file.
- Open imported artifacts directly in replay/tournament inspection mode.
- Add local persistence using IndexedDB or a storage adapter.
- Define a storage interface that can later be server-backed.
- Add event filters and richer replay metadata.

### Acceptance criteria

- exported artifact can be imported into a fresh browser session
- imported artifact produces the same rankings/replay data
- replay works without rerunning controllers
- live and replay remain visually consistent

## Milestone 5 — Production Sandbox Architecture

### Goal

Design the path for accepting hostile public submissions safely.

### Work

- Specify a server runtime protocol compatible with the controller action contract.
- Evaluate process/container/VM isolation options.
- Define startup/per-tick CPU, memory, output, filesystem and network quotas.
- Add admission validation and source-size limits.
- Define runtime crash/timeout telemetry.
- Keep authoritative engine execution separate from sandbox implementation details.

### Acceptance criteria

- browser isolation is clearly distinguished from hostile multi-tenant isolation
- no public deployment claims `new Function` or browser Worker alone is a secure sandbox
- resource limits and fallback semantics are explicit

## Milestone 6 — Spectator Extensions

The core spectator stack now exists. Future work here should be incremental rather than another renderer rewrite.

Possible additions:

- replay cinematic presets for specific highlight categories
- richer chaos-specific environment animation
- mobile automatic quality selection
- audio/SFX layer
- accessibility modes for effects and camera shake
- arena themes that reuse the same renderer contracts

## Milestone 7 — New Modes and Arenas

Only begin after submission + Worker + artifact foundations are stable.

Possible work:

- alternative arena layouts
- team mode
- objective/control-point mode
- hazards with meaningful strategic trade-offs
- multiple Three.js arena themes

Any new mode should first prove that it creates meaningful controller trade-offs.

## Explicit non-goals

Do not prioritize:

- cosmetic skin catalogs
- dozens of weapons without strategic purpose
- many visually different maps with identical mechanics
- model leaderboard claims
- real-time LLM calls during a match
- renderer-specific physics or collision rules
- rewriting the authoritative engine around Three.js
- exposing hidden model chain-of-thought

## Recommended implementation order

```text
✓ Three.js Presentation Phase 2
        ↓
NOW: Controller Submission Workspace
        ↓
2. External Worker evaluation path
3. Tournament Worker + progress streaming
4. Artifact import + persistence
5. Production sandbox design
6. Spectator extensions
7. New modes / arenas
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
watch agents fight in a readable Three.js arena
        ↓
inspect the same match with Three.js replay + highlights
        ↓
export evidence
        ↓
reload/import it later without rerunning controllers
```

At that point AgentFighting is both a controller experimentation platform and a compelling visual explanation of autonomous behavior.
