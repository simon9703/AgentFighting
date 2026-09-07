# AgentFighting v2 Plan

## Theme

**Submission Platform + Scalable Evaluation + Spectator-Grade Three.js Presentation**

v1 proved the authoritative architecture and local tournament loop. v2 turns that loop into a usable controller experimentation platform while making behavior visibly understandable and entertaining to watch.

The presentation goal is no longer a minimal dashboard. The default live renderer is now **Three.js**, inspired by polished browser arcade projects such as `turbo-kart-rush`: a strong 3D scene, readable HUD, camera language, particles and effects layered over authoritative simulation data.

Three.js remains an implementation detail of presentation. The engine, tournament pipeline and replay format stay renderer-agnostic.

## Current focus — Presentation Phase 2

### Goal

Make the live arena immediately communicate movement, combat, weapons, chaos and agent intent without requiring the event log.

### Completed

- Three.js live arena viewport replaces the old DOM/CSS pseudo-arena.
- Low-poly fighter presentation with lighting, shadows, fog and arena geometry.
- Dynamic spectator camera with framing based on fighter spread.
- Camera shake for significant combat events.
- Dedicated presentation-only `ArenaFx` particle system.
- Movement trails for fast fighters.
- Hit / weapon / stock-loss / elimination burst effects.
- Weapon pickups rendered as animated 3D objects.
- Agent intent rings derived from controller-provided short intent labels.
- Chaos changes arena/rim lighting without modifying simulation rules.
- React HUD remains separate from WebGL rendering.

### Next visual work

1. Attack readability
   - anticipation flash
   - attack arc / aim direction
   - heavy-attack wind-up
   - dodge burst
   - shield field
   - push-gun projectile/tracer
   - bomb fuse/explosion staging
2. Camera language
   - overview / combat-focus modes
   - short KO emphasis
   - selected-fighter follow mode
   - replay highlight camera presets
3. Environment
   - richer arena silhouettes
   - ramps/platforms where engine rules support them
   - animated hazard presentation
   - chaos-specific environment treatment
4. Post effects
   - subtle bloom
   - vignette
   - hit flash
   - restrained chromatic/energy distortion for major events
5. AI behavior visualization
   - target indicator
   - recent intent changes
   - short planned-direction vector from action/velocity data
   - selected fighter tactical overlay
   - no chain-of-thought display

### Acceptance criteria

- a viewer can identify major combat events without reading raw logs
- effects are derived only from immutable state/events/actions
- no Three.js code determines damage, collision, stocks, weapons or winner state
- visual intensity remains readable on mobile and does not obscure agents
- the live and replay renderers can share the same presentation primitives

## Milestone 1 — Controller Submission Workspace

### Goal

Let a user create or paste a complete `ControllerSubmission`, validate it before execution, and understand exactly what will be locked.

### Work

- Add `/submit` or a submission panel inside Tournament Lab.
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
- Emit queued/running/partial/completed/failed/cancelled progress events.
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
- Improve replay controls: play/pause, speed, jump to event, highlight navigation, event filters and selected-fighter focus.
- Reuse Three.js presentation primitives in replay mode rather than maintaining a visually separate replay system.

### Acceptance criteria

- exported artifact can be imported into a fresh browser session
- imported artifact produces the same rankings/replay data
- replay can be navigated without rerunning controllers
- live and replay views remain visually consistent

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

## Milestone 6 — Spectator and Replay Polish

### Goal

Turn presentation primitives into a coherent spectator system rather than isolated effects.

### Work

```text
authoritative state/events/actions
        ↓
renderer view model
        ↓
Three.js arena + ArenaFx + camera director
        ↓
React HUD / timeline / replay controls
```

Add:

- shared camera director
- shared event-to-effect mapping
- replay highlight shots
- selected fighter focus
- intent readability
- event feed hierarchy
- match-end presentation
- mobile visual quality tiers

### Acceptance criteria

- renderer effects are deterministic enough for debugging but never authoritative
- major events have consistent visual language across live/replay
- presentation modules are reusable instead of accumulating logic in one component

## Milestone 7 — New Modes and Arenas

Only begin after submission + Worker + artifact/replay foundations are stable.

Possible work:

- alternative arena layouts
- team mode
- objective/control-point mode
- hazards with meaningful strategic trade-offs
- multiple Three.js arena themes
- optional alternate renderer experiments

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
NOW: Three.js Presentation Phase 2
  ↓
1. Submission Workspace
2. External Worker evaluation path
3. Tournament Worker
4. Artifact import + Three.js replay
5. Production sandbox design
6. Spectator polish / post FX / camera director
7. New modes and arenas
```

Visual work may continue in parallel when it does not change engine contracts.

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
see intent, movement, weapons and major decisions visually
        ↓
inspect behavior + replay + highlights
        ↓
export evidence
        ↓
reload/import it later without rerunning controllers
```

At that point AgentFighting is both a controller experimentation platform and a compelling visual explanation of autonomous behavior.
