# AgentFighting Roadmap

## v1 — Architecture and Local Product Loop

### Foundation

- ☑️ Headless authoritative arena engine
- ☑️ Same-tick observation and action resolution
- ☑️ Seeded RNG and reproducible match configuration
- ☑️ Combat, stocks, weapons, chaos events and match summary
- ☑️ Renderer-agnostic contracts
- ☑️ `prepareTick()` / `resolvePreparedTick()` split for shared sync/async authoritative resolution

### Controller workflow

- ☑️ `Observation -> Action` controller contract
- ☑️ Action sanitization and neutral failure fallback
- ☑️ Submission schema and strategy manifest
- ☑️ Source policy validation
- ☑️ Stable source/controller identities
- ☑️ Trusted local source compiler
- ☑️ ControllerLock with stable lock hash
- ☑️ Canonical sample submissions
- ☑️ `/submit` Controller Submission Workspace
- ☑️ Add/remove/edit multiple submissions
- ☑️ Validation issue UI
- ☑️ Source hash/controller identity preview
- ☑️ Exact-submission UI lock and export

### Runtime boundary

- ☑️ `ControllerRuntime` / async runtime abstractions
- ☑️ Trusted in-process runtime
- ☑️ Asynchronous same-tick action collection protocol
- ☑️ Browser Worker runtime per external controller
- ☑️ Startup timeout
- ☑️ Per-tick timeout
- ☑️ Timeout/failure neutral fallback
- ☑️ Controller decision latency measurement
- ☑️ Dedicated Tournament Worker
- ☑️ Progress streaming
- ☑️ Partial tournament aggregate streaming
- ☑️ Cancellation
- ☑️ Seed list/range/preset UI up to 100 browser seeds
- ☐ Hardened process/container/microVM runtime for hostile public submissions
- ☐ Enforced server-side CPU/memory/process/filesystem/network quotas

### Replay and evidence

- ☑️ Per-tick sanitized action recording
- ☑️ Authoritative state/event recording
- ☑️ Versioned `MatchRecord`
- ☑️ Action-only deterministic replay verification
- ☑️ Renderer-agnostic highlight timeline
- ☑️ Versioned `TournamentArtifact`
- ☑️ Markdown tournament report
- ☑️ JSON artifact download
- ☑️ Artifact JSON import
- ☑️ ControllerLock/submission/replay structural validation on import
- ☑️ IndexedDB artifact storage adapter
- ☑️ Recent-evidence reopen UI
- ☑️ Replay without rerunning controllers
- ☐ Deep validation of every nested replay/world-state field
- ☐ Artifact rename/delete/storage-management UI
- ☐ Explicit storage migration strategy for future artifact schema versions

### Tournament evaluation

- ☑️ Trusted synchronous multi-seed tournament runner
- ☑️ Worker-backed external multi-seed evaluation
- ☑️ Win rate and average rank
- ☑️ Aggregate combat/movement statistics
- ☑️ Behavior Fingerprint
- ☑️ Submission → lock → tournament → record → artifact pipeline
- ☑️ Long tournament orchestration off the React main UI thread
- ☑️ Progress + partial-result streaming
- ☑️ Named reference presets and custom seed ranges
- ☐ Target-device benchmark suite for 50–100 seeds
- ☐ Persistent benchmark/runtime telemetry history

### Product presentation

- ☑️ Live authoritative arena viewer
- ☑️ Three.js default live renderer
- ☑️ Low-poly 3D arena / fighters / lighting / fog / quality-dependent shadows
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
- ☑️ Automatic conservative visual quality selection for constrained clients
- ☑️ Reduced-motion-aware quality selection and camera hardening foundation
- ☑️ Optional event-driven procedural spectator SFX
- ☑️ Tournament Lab and Behavior Fingerprint UI
- ☑️ Three.js live/replay presentation parity
- ☑️ Replay play/pause, 0.5×–4× speed, scrubber and seed switching
- ☑️ Highlight navigation
- ☑️ Replay selected-fighter camera focus
- ☐ Replay audio toggle / event-category sound controls
- ☐ Explicit in-product reduced-camera-shake toggle independent of OS preference
- ☐ More cinematic highlight camera presets
- ☐ Richer chaos-specific scene animation and arena themes

## Architecture status

The following are treated as established boundaries rather than open redesign questions:

- one authoritative engine
- same prepared-tick observation semantics
- one resolution path for trusted and Worker-backed controllers
- versioned controller/replay/artifact identities
- Three.js as default product renderer but never match authority
- live and replay consuming the same renderer-neutral snapshots
- browser Workers as fault isolation, not public hostile-code security

Do not create parallel engines, replay formats or evaluation pipelines to ship a feature faster.

## v2 — Current hardening phase

The core v2 product loop now exists:

```text
Submission Workspace
→ validate + lock
→ Tournament Worker
→ Controller Workers
→ authoritative evaluation
→ runtime diagnostics + partial aggregates
→ TournamentArtifact
→ IndexedDB / export / import
→ Tournament Lab
→ Three.js replay
```

### Current priority

1. **50–100 seed target-device benchmarking and performance tuning**
2. deeper artifact/replay schema validation
3. artifact storage management and migrations
4. spectator accessibility/audio polish
5. strategic arena/mode experiments with measurable behavior trade-offs
6. hardened server sandbox implementation before public hostile arbitrary-source execution

The server isolation contract and deployment gate are documented in [`SANDBOX.md`](./SANDBOX.md). Detailed implementation status is maintained in [`PLAN.md`](./PLAN.md).
