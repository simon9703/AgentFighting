# AgentFighting Roadmap

## v1 — Architecture and Local Product Loop

### Foundation

- ☑️ Headless authoritative arena engine
- ☑️ Same-tick observation and action resolution
- ☑️ Seeded RNG and reproducible match configuration
- ☑️ Combat, stocks, weapons, chaos events and match summary
- ☑️ Renderer-agnostic contracts

### Controller workflow

- ☑️ `Observation -> Action` controller contract
- ☑️ Action sanitization and failure fallback
- ☑️ Submission schema and strategy manifest
- ☑️ Source policy validation
- ☑️ Stable source/controller identities
- ☑️ Trusted local source compiler
- ☑️ ControllerLock with stable lock hash
- ☑️ Canonical sample submissions

### Runtime boundary

- ☑️ `ControllerRuntime` abstraction
- ☑️ Trusted in-process runtime
- ☑️ Asynchronous same-tick action collection protocol
- ☑️ Browser Worker runtime
- ☑️ Startup timeout
- ☑️ Per-tick timeout
- ☑️ Terminate/fallback behavior on timeout/failure
- ☐ Hardened process/container runtime for hostile public submissions
- ☐ Hard server-side CPU/memory/filesystem/network quotas

### Replay and evidence

- ☑️ Per-tick sanitized action recording
- ☑️ Authoritative state/event recording
- ☑️ Versioned `MatchRecord`
- ☑️ Action-only deterministic replay verification
- ☑️ Compact renderer-agnostic highlight timeline
- ☑️ Versioned `TournamentArtifact`
- ☑️ Markdown tournament report
- ☑️ JSON artifact download
- ☐ Artifact import and persistent local/server storage

### Tournament evaluation

- ☑️ Multi-seed tournament runner
- ☑️ Win rate and average rank
- ☑️ Aggregate combat/movement statistics
- ☑️ Behavior Fingerprint
- ☑️ Submission → lock → tournament → record → artifact pipeline
- ☐ Long tournament execution off the browser main thread
- ☐ Progress/partial-result streaming
- ☐ Named tournament presets and seed-range configuration UI

### Product presentation

- ☑️ Live authoritative arena viewer
- ☑️ Three.js default live renderer
- ☑️ Low-poly 3D arena / fighters / lighting / shadows / fog
- ☑️ Presentation-only `ArenaFx`
- ☑️ Movement trails and event bursts
- ☑️ Attack arc / heavy attack readability
- ☑️ Dodge burst and shield field
- ☑️ Weapon tracer / target link
- ☑️ 3D weapon pickups
- ☑️ Agent intent and movement-direction visualization
- ☑️ Chaos-reactive environment treatment
- ☑️ `CameraDirector`: overview / combat / KO / fighter focus
- ☑️ `ArenaPostFX`: bloom / vignette / hit flash / restrained distortion
- ☑️ Responsive game-style React HUD
- ☑️ Live selected-fighter follow camera
- ☑️ Tournament Lab
- ☑️ Behavior fingerprint UI
- ☑️ Replay scrubber / seed switching / highlight navigation
- ☑️ Three.js replay parity with live presentation
- ☑️ Replay play/pause and 0.5×–4× speed
- ☑️ Replay selected-fighter camera focus
- ☐ Automatic mobile visual quality selection
- ☐ Audio/SFX spectator layer
- ☐ Real submission editor/import UI
- ☐ Validation/policy violation UI
- ☐ Artifact import/replay viewer

## v1 completion status

The local/reference product loop is complete and the authoritative engine/evaluation architecture is treated as frozen. New work extends existing contracts instead of creating parallel game/evaluation systems.

## v2 — Submission Platform, Scalable Evaluation and Spectator Presentation

The product has two first-class surfaces:

1. trustworthy controller experimentation/evaluation
2. spectator-grade visualization of autonomous behavior

Three.js is the default presentation implementation, not an engine dependency.

### Current priority

1. ☑️ Three.js Presentation Phase 2
2. **Controller Submission Workspace — current focus**
3. Worker-backed external execution end to end
4. Tournament Worker and progress streaming
5. Artifact import/persistence
6. Production sandbox architecture
7. Spectator extensions / audio / mobile quality
8. New arenas/game modes after the platform path is stable

Detailed milestones and acceptance criteria are maintained in [`PLAN.md`](./PLAN.md).
