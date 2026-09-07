# AgentFighting v2 Plan

## Theme

**Controller Experimentation Platform + Scalable Evaluation + Spectator-Grade Three.js Presentation**

The project now has one authoritative engine and two execution/presentation paths built around the same contracts:

```text
trusted reference controllers ─┐
                              ├─ authoritative engine ─ replay/artifact ─ Three.js
external controller Workers ──┘
```

Three.js is the default product presentation, not an engine dependency.

## Completed — Presentation Phase 2

- Three.js live arena replacing the previous DOM/CSS pseudo-arena.
- Low-poly fighters, weapons, arena geometry, lighting, fog and shadows.
- `ArenaFx` for trails, bursts, rings, attack arcs, heavy attacks, dodge, shield and weapon tracers.
- `CameraDirector` with overview, combat, KO and selected-fighter modes.
- `ArenaPostFX` with bloom, vignette, hit flash and restrained energy/chromatic treatment.
- Chaos-reactive arena/post-processing presentation.
- Observable intent/direction visualization without hidden reasoning.
- Shared `ThreeArenaViewport` for live and replay.
- Replay play/pause, 0.5×–4× speed, seed switching, scrubber, highlights and fighter focus.
- Responsive game-style HUD.

## Completed — Milestone 1: Controller Submission Workspace

`/submit` now provides:

- multiple editable participants
- agent/model fields
- strategy-manifest JSON editing
- controller JavaScript editing
- canonical Zod validation
- source-policy validation
- visible validation errors
- source hash and controller identity preview
- add/remove participants
- exact-submission UI lock
- portable submission export
- direct isolated tournament launch after locking

The UI lock is not authoritative. Evaluation independently creates the canonical `ControllerLock` from the validated bytes.

## Completed — Milestone 2: Worker-backed External Execution Foundation

The engine was refactored without introducing a second simulator:

```text
engine.prepareTick()
        ↓
identical immutable observations
        ↓
Controller Worker A ─┐
Controller Worker B ─┼─ concurrent collection + deadline/fallback
Controller Worker C ─┘
        ↓
engine.resolvePreparedTick(actions)
```

The original synchronous `step()` now uses the same prepare/resolve core.

Delivered:

- one browser Worker runtime per external controller
- source-policy validation before Worker startup
- startup timeout
- per-tick timeout
- concurrent same-tick collection
- neutral sanitized fallback
- timeout/failure diagnostics outside authoritative state
- accepted actions recorded into normal `MatchRecord`s
- controller runtimes recreated between independent seeded matches

Browser Workers are fault isolation, not a hardened hostile multi-tenant security boundary.

## Completed foundation — Milestone 3: Tournament Worker and Progress Streaming

Delivered:

- dedicated tournament orchestration Worker
- nested per-controller Workers
- progress messages while each match runs
- match/tick progress exposed to the Submission Workspace
- cancellation by terminating the tournament Worker
- periodic yielding inside browser evaluation
- portable final artifact identical in shape to the trusted path
- reusable aggregation from authoritative `MatchSummary`s

Remaining hardening before calling this production-scale:

- configurable seed-range/preset UI instead of the current reference seed list
- explicit 50–100 seed browser load benchmarks on target mobile/desktop devices
- optional partial aggregate/fingerprint streaming rather than only execution progress
- richer runtime-duration telemetry

## Mostly completed — Milestone 4: Artifact Import, Persistence and Replay UX

Delivered:

- `TournamentArtifact` JSON parser/validator
- ControllerLock validation during import
- submission validation during import
- replay-record structural validation
- JSON file import in Tournament Lab
- open imported evidence without rerunning controllers
- IndexedDB storage adapter
- automatic persistence after isolated evaluation
- recent-evidence reopening
- manual local save
- Three.js replay parity with live

Remaining polish:

- event-category filters
- artifact delete/rename UI
- stronger schema validation for every deeply nested replay field
- storage migration strategy for future schema versions

## Architecture completed — Milestone 5: Production Sandbox Design

See [`SANDBOX.md`](./SANDBOX.md).

Specified:

- server runtime protocol
- one isolated runtime per controller
- process/container/microVM options
- startup/per-tick deadlines
- CPU, memory, process, disk, output and network limits
- admission validation
- failure/fallback semantics
- runtime diagnostics
- public-deployment security gate

Not implemented yet: the hardened server sandbox itself. Public hostile multi-tenant arbitrary-source execution must remain disabled until that deployment gate is satisfied.

## Current focus — Product Hardening + Spectator Extensions

### A. Evaluation hardening

- seed-range/preset controls
- 50–100 seed load testing
- partial aggregate streaming
- runtime latency/timeout visualization
- artifact storage management
- deeper import schema verification

### B. Spectator extensions

- automatic visual quality selection for constrained devices
- audio/SFX layer driven only from public match events
- reduced-motion / reduced-camera-shake mode
- richer chaos-specific environment animation
- cinematic replay camera presets for highlight categories
- arena themes that reuse renderer contracts

### C. New strategic modes after hardening

Candidates:

- alternative arena layouts
- team mode
- objective/control-point mode
- hazards that create real controller trade-offs

Any new mode must first demonstrate behavioral differentiation. Visual variety alone is not enough reason to change authoritative rules.

## Explicit non-goals

- cosmetic catalogs before strategy/platform quality
- large weapon counts without meaningful trade-offs
- maps with different skins but identical decisions
- serious model-benchmark claims
- real-time LLM calls during a match
- renderer-specific physics/collision rules
- rewriting the engine around Three.js
- exposing hidden model chain-of-thought
- calling browser Workers a secure public-code sandbox

## Current implementation order

```text
✓ Three.js Presentation Phase 2
✓ Submission Workspace
✓ Worker-backed external evaluation foundation
✓ Tournament Worker + progress/cancel foundation
✓ Artifact import + IndexedDB persistence
✓ Production sandbox architecture document
        ↓
NOW
1. evaluation hardening / configurable tournaments
2. spectator accessibility + audio + adaptive quality
3. richer replay/artifact management
4. strategic arena/mode experiments
5. hardened server sandbox implementation before public arbitrary code
```

## v2 product loop now available

```text
edit/paste AI-generated controllers
        ↓
validate source + strategy
        ↓
lock exact submissions
        ↓
Tournament Worker
        ↓
per-controller isolated Workers
        ↓
same-tick authoritative evaluation
        ↓
behavior aggregate + replay records
        ↓
portable artifact persisted locally
        ↓
Tournament Lab
        ↓
Three.js replay + highlights + fighter focus
        ↓
export / import / reopen later
```

The next work should improve scale, observability, accessibility and strategic depth rather than introduce another engine or presentation architecture.
