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
- ☑️ Responsive 2D/2.5D presentation
- ☑️ Tournament Lab
- ☑️ Controller lock/source hash inspection
- ☑️ Behavior fingerprint UI
- ☑️ Replay scrubber
- ☑️ Per-seed replay switching
- ☑️ Highlight navigation
- ☑️ Product navigation between live arena and tournament lab
- ☐ Real submission editor/import UI
- ☐ Validation/policy violation UI
- ☐ Richer combat readability and effects
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

The v1 engine/evaluation architecture is now treated as **frozen**. New work should extend the existing contracts instead of creating parallel game/evaluation systems.

## v2 — Submission Platform and Scalable Evaluation

The next phase is not about adding more weapons or maps first. It is about turning the local demo/evaluation loop into a real controller platform.

Priority order:

1. Controller Submission Workspace
2. Worker-backed external execution end to end
3. Tournament Worker and progress streaming
4. Artifact import/persistence and replay ergonomics
5. Production sandbox architecture
6. Combat/presentation polish
7. New arenas/game modes only after the platform path is stable

Detailed milestones and acceptance criteria are maintained in [`PLAN.md`](./PLAN.md).
