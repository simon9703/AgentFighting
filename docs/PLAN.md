# AgentFighting v2 Plan

## Theme

**Controller Experimentation Platform + Scalable Evaluation + Spectator-Grade Three.js Presentation**

The project now has one authoritative engine and two execution paths built around the same contracts:

```text
trusted reference controllers ─┐
                              ├─ authoritative engine ─ replay/artifact ─ Three.js
external controller Workers ──┘
```

Three.js is the default product presentation, not an engine dependency.

## Completed — Spectator presentation foundation

- Three.js live arena replacing the previous DOM/CSS pseudo-arena.
- Low-poly fighters, weapons, arena geometry, lighting, fog and shadows.
- `ArenaFx`: trails, bursts, rings, attack/heavy arcs, dodge, shield, tracers and target links.
- `CameraDirector`: overview, combat, KO and selected-fighter modes.
- `ArenaPostFX`: bloom, vignette, hit flash and restrained distortion.
- Chaos-reactive arena/post-processing presentation.
- Observable short `intent` and movement-direction visualization without hidden reasoning.
- Shared `ThreeArenaViewport` for live and replay.
- Replay play/pause, 0.5×–4× speed, seed switching, scrubber, highlights and fighter focus.
- Automatic conservative rendering profile on narrow, low-resource or reduced-motion clients.
- Optional user-enabled procedural SFX driven only by public match events.
- Reduced-motion camera hardening support without any simulation changes.

## Completed — Controller Submission Workspace

`/submit` provides:

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
- comma/space seed lists
- deterministic seed ranges such as `1-50`
- 5/20/50/100-seed presets with a 100-seed browser cap

The UI lock is only an editing guard. Evaluation independently creates the canonical `ControllerLock` from validated exact bytes.

## Completed — Worker-backed external evaluation foundation

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

The original synchronous `step()` uses the same prepare/resolve core.

Delivered:

- one browser Worker runtime per external controller
- source-policy validation before Worker startup
- startup timeout
- per-tick timeout
- concurrent same-tick collection
- neutral sanitized fallback
- accepted actions recorded into normal `MatchRecord`s
- controller runtimes recreated between independent seeded matches
- timeout/failure counters outside authoritative state
- per-controller decision latency sampling, average and maximum latency

Browser Workers are fault isolation, not a hardened hostile multi-tenant security boundary.

## Completed foundation — Tournament Worker + progress

Delivered:

- dedicated tournament orchestration Worker
- nested per-controller Workers
- progress messages while each match runs
- match/tick progress exposed to Submission Workspace
- cancellation by terminating the Tournament Worker
- periodic browser yielding
- final artifact matching the trusted path schema
- reusable authoritative `MatchSummary` aggregation
- partial tournament/leader aggregate after each completed seed
- live current-decision latency display
- completion summary for timeout/failure counts and slowest average controller latency

Remaining validation before calling browser execution production-scale:

- explicit 50–100 seed load benchmark runs on representative desktop/mobile devices
- benchmark history and regression thresholds

## Mostly completed — Artifact import, persistence and replay UX

Delivered:

- `TournamentArtifact` JSON parser/validator
- ControllerLock validation during import
- submission validation during import
- replay-record structural validation
- JSON import in Tournament Lab
- imported replay without rerunning controllers
- IndexedDB storage adapter
- automatic persistence after isolated evaluation
- recent-evidence reopening
- manual local save
- Three.js replay parity with live

Remaining product hardening:

- artifact delete/rename/storage management UI
- deeper validation for every nested replay/world-state field
- storage migration strategy for future schema versions
- optional event-category filters

## Architecture completed — Production sandbox design

See [`SANDBOX.md`](./SANDBOX.md).

Specified:

- server runtime protocol
- one isolated runtime per controller
- process/container/microVM implementation options
- startup/per-tick deadlines
- CPU, memory, process, disk, output and network limits
- admission validation
- failure/fallback semantics
- runtime diagnostics
- public-deployment security gate

Not implemented: the hardened server sandbox itself. Public hostile multi-tenant arbitrary-source execution must remain disabled until the deployment gate is satisfied.

## Current focus — hardening and strategic depth

### A. Evaluation / evidence hardening

1. run and record 50–100 seed target-device benchmarks
2. define performance/regression thresholds
3. deepen artifact/replay schema verification
4. add artifact rename/delete/storage-management UI
5. define artifact storage migration policy

### B. Spectator polish

Already delivered:

- adaptive low/high renderer selection
- OS reduced-motion-aware conservative profile
- procedural event SFX with explicit user enable

Remaining:

- explicit in-product reduced-camera-shake toggle independent of OS preference
- replay audio and event-category sound controls
- richer chaos-specific environment animation
- cinematic replay camera presets for highlight categories
- reusable arena themes

### C. Strategic mode experiments

Only after the current hardening baseline is measured:

- alternative arena layouts
- team mode
- objective/control-point mode
- hazards that create measurable controller trade-offs

Any new mode must demonstrate behavioral differentiation. Visual variety alone is not enough reason to alter authoritative rules.

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
✓ Three.js spectator foundation
✓ Submission Workspace
✓ Worker-backed external evaluation
✓ Tournament Worker + progress/cancel
✓ partial aggregates + runtime latency diagnostics
✓ configurable seeds / 5-100 seed presets
✓ Artifact import + IndexedDB persistence
✓ adaptive rendering + public-event SFX
✓ Production sandbox architecture document
        ↓
NOW
1. target-device 50–100 seed benchmarks
2. deep artifact validation + storage management
3. spectator accessibility/replay polish
4. strategic arena/mode experiments
5. hardened server sandbox before public hostile arbitrary code
```

## v2 product loop now available

```text
edit/paste AI-generated controllers
        ↓
validate source + strategy
        ↓
lock exact submissions
        ↓
choose deterministic seed set/range
        ↓
Tournament Worker
        ↓
per-controller isolated Workers
        ↓
same-tick authoritative evaluation
        ↓
partial aggregates + runtime diagnostics
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

Next work should improve measured scale, evidence robustness, accessibility and strategic depth rather than introduce another engine or presentation architecture.
