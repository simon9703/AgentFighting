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
- ☑️ Dynamic spectator camera and combat camera shake
- ☑️ Presentation-only particle system (`ArenaFx`)
- ☑️ Fast-movement trails
- ☑️ Hit / weapon / stock-loss / elimination effects
- ☑️ 3D weapon pickups
- ☑️ Agent intent visualization
- ☑️ Chaos-reactive environment lighting
- ☑️ Responsive game-style React HUD
- ☑️ Tournament Lab
- ☑️ Controller lock/source hash inspection
- ☑️ Behavior fingerprint UI
- ☑️ Replay scrubber
- ☑️ Per-seed replay switching
- ☑️ Highlight navigation
- ☑️ Product navigation between live arena and tournament lab
- ☐ Attack arc / heavy wind-up / dodge / shield readability
- ☐ Shared spectator camera director
- ☐ Post-processing stack and visual quality tiers
- ☐ Three.js replay presentation parity
- ☐ Real submission editor/import UI
- ☐ Validation/policy violation UI
- ☐ Artifact import/replay viewer

## v1 completion status

The local/reference product loop is complete:

```text
sample submissions
→ validate
→ identify + lock
→ seeded tournament
→ authoritative records
→ behavior fingerprints
→ replay/highlights
→ artifact/report export
```

The v1 engine/evaluation architecture is treated as **frozen**. New work extends existing contracts instead of creating parallel game/evaluation systems.

## v2 — Submission Platform, Scalable Evaluation and Spectator Presentation

The product now has two equally important surfaces:

1. a trustworthy controller experimentation/evaluation pipeline
2. a spectator-grade visualization that makes autonomous behavior understandable

Three.js is the default live presentation implementation, but it is not part of the authoritative engine contract.

Priority order:

1. Finish current Three.js Presentation Phase 2
2. Controller Submission Workspace
3. Worker-backed external execution end to end
4. Tournament Worker and progress streaming
5. Artifact import/persistence + Three.js replay parity
6. Production sandbox architecture
7. Shared camera/post-FX/spectator polish
8. New arenas/game modes only after the platform path is stable

Detailed milestones and acceptance criteria are maintained in [`PLAN.md`](./PLAN.md).
