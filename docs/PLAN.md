# AgentFighting v2 Plan

## Theme

**Controller Experimentation Platform + Scalable Evaluation + Spectator-Grade Three.js Presentation**

The project keeps one authoritative engine and renderer-neutral contracts:

```text
trusted reference controllers ─┐
                              ├─ authoritative engine ─ replay/artifact ─ Three.js
external controller Workers ──┘
```

Three.js is the default presentation layer, never a source of combat truth.

## Architecture invariant

```text
Agent / Strategy / Simulation
        ↓
   Battle Engine
        ↓
BattleSnapshot / ViewModel
        ↓
  Renderer Layer
   ├─ Three.js       ← battle world / animation / FX
   └─ React DOM      ← HUD / telemetry / replay controls
```

Rules remain fixed:

- simulation, strategy, events and settlement do not depend on Three.js
- all controllers observe the same prepared tick state
- all actions are collected before authoritative resolution
- renderer interpolation/animation cannot affect combat state
- renderer randomness never feeds back into engine state
- `intent` is a short public/debug label, not hidden reasoning
- browser Workers provide fault isolation, not hardened hostile-code security

## Completed — Evaluation and controller platform

### Controller Submission Workspace

`/submit` now supports:

- multiple participant drafts
- agent/model identity fields
- strategy-manifest JSON editing
- JavaScript controller source editing
- Zod + source-policy validation
- source hash / controller ID preview
- add/remove participants
- exact-submission UI lock
- submission bundle export
- direct Worker-backed tournament launch
- comma/space seed lists
- ranges such as `1-50`
- 5 / 20 / 50 / 100 seed presets
- 100-seed browser cap

Evaluation separately builds the authoritative `ControllerLock`; the UI lock is only an editing guard.

### Same-tick authoritative engine API

Delivered:

```text
engine.prepareTick()
        ↓
identical immutable observations
        ↓
Controller Worker A ─┐
Controller Worker B ─┼─ collect concurrently + deadline/fallback
Controller Worker C ─┘
        ↓
engine.resolvePreparedTick(actions)
```

The trusted synchronous `step()` path uses the same prepare/resolve core.

### Browser Worker evaluation

Delivered:

- one Worker runtime per external controller
- source-policy validation before startup
- startup timeout
- per-tick timeout
- concurrent same-tick action collection
- neutral sanitized fallback actions
- controller runtime recreation per seed
- timeout/failure diagnostics
- per-controller latency sampling
- average/max latency reporting

### Tournament Worker

Delivered:

- dedicated tournament orchestration Worker
- nested controller Workers
- progress by seed/tick
- partial tournament rankings after each completed seed
- current decision latency display
- cancellation
- periodic yielding
- final artifact using the same schema as trusted evaluation

Remaining scale validation:

- representative desktop/mobile 50–100 seed benchmark runs
- benchmark history
- regression thresholds

## Completed — Evidence / replay loop

Delivered:

- versioned `TournamentArtifact`
- ControllerLock validation
- submission validation
- deep replay/world-state validation
- strict replay tick ordering checks
- replay seed/config consistency validation
- controller identity consistency validation
- JSON import
- replay without rerunning controllers
- IndexedDB persistence
- automatic save after isolated evaluation
- recent evidence reopening
- manual save/export
- shared Three.js live/replay renderer
- replay play/pause
- 0.5× / 1× / 2× / 4× playback
- seed switching
- scrubber
- highlight jumps
- selected fighter focus

Remaining storage work:

- artifact delete
- artifact rename/label metadata
- storage usage management
- schema migration policy

## Completed — Three.js spectator foundation

Delivered:

- full-screen/full-bleed Three.js arena
- broadcast-style React HUD overlay instead of dashboard layout
- articulated low-poly mech fighters
- arena platform, lower deck, cover, walls and towers
- stronger depth and vertical composition
- ground weapon pickups
- world-space fighter labels
- fighter name / damage / intent labels
- fighter interpolation
- authoritative velocity orientation
- selection focus state
- chaos-reactive lighting
- adaptive high/low quality profiles
- reduced-motion support

### Presentation FX

`ArenaFx` currently provides:

- hit/KO bursts
- movement trails
- event rings
- normal/heavy attack arcs
- weapon beam
- dodge FX
- shield FX
- target links

### Camera + post FX

Delivered:

- `CameraDirector`
  - overview
  - combat
  - KO
  - selected-fighter focus
  - lower spectator/broadcast framing
  - shake/emphasis
- `ArenaPostFX`
  - bloom
  - vignette
  - hit flash
  - restrained energy/chromatic distortion
- procedural event SFX from public `MatchEvent`s only

## Completed foundation — Fighter presentation rig

New renderer-only `FighterRig` layer is now separated from `ThreeArenaViewport`.

Current rig behavior:

```text
authoritative velocity
→ stride cycle
→ arm counter-swing
→ body lean
→ body bob

authoritative intent/event
→ attack pose
→ heavy pose
→ dodge pose
→ hit recoil
→ KO lean
→ respawn pulse
```

Held weapons are now rendered from authoritative `fighter.weapon` state:

- hammer
- shield
- bomb
- push gun

No rig animation affects engine motion, collision, hit resolution, damage or stocks.

## Current focus — Combat presentation phase

This is now the highest-priority product work because the architecture/evaluation foundation is already strong enough and the largest visible gap is fight readability.

### A. Fighter action state machine

Upgrade the current continuous pose reactions into explicit presentation phases:

```text
idle
run
attack.windup
attack.active
attack.recovery
heavy.windup
heavy.active
heavy.recovery
dodge
hit
ko
respawn
```

Goals:

- attacks should visually read as discrete actions instead of short arm offsets
- heavy attacks need clear charge → release → recovery
- dodge needs clear directional burst/posture
- hit reaction should have readable recoil
- KO should visually communicate launch/rotation/removal
- respawn should have a clear landing/re-entry moment

This remains renderer-only; authoritative action timing continues to come from engine snapshots/events.

### B. Weapon-specific animation

Implement distinct held-weapon presentation:

- hammer: large two-stage swing / heavy follow-through
- shield: raise/brace forward
- push gun: raise, fire and recoil
- bomb: lift, throw arc and release FX

Weapon use visuals should consume existing authoritative weapon state/events. Do not add renderer-owned weapon rules.

### C. Event reaction layer

Keep per-fighter transient presentation reactions:

```text
Map<fighterId, {
  attack,
  heavy,
  dodge,
  hit,
  ko,
  respawn
}>
```

Next improvements:

- derive hit recoil direction from actor/target positions
- distinguish stock-loss vs final elimination
- emphasize successful heavy hits
- distinguish weapon-use reactions by weapon type
- avoid replay divergence by deriving all triggers from recorded public events/state

### D. Camera choreography

After action phases are readable:

- pair framing for nearby combatants
- brief heavy-hit push-in
- weapon-use emphasis
- KO tracking without losing arena context
- highlight replay camera presets
- reduced-camera-shake user toggle independent of OS preference

### E. Arena readability

Improve the world only where it helps strategy and viewing:

- clearer arena boundary/death edge
- clearer cover readability
- better weapon spawn readability
- restrained chaos environment animation
- reusable arena-theme primitives

Do not add decorative geometry that hides fighters or confuses authoritative collision boundaries.

## Next — Code organization cleanup

`ThreeArenaViewport.tsx` is still too large. After fighter/weapon action work stabilizes, extract:

```text
ThreeArenaViewport
├─ ArenaEnvironment.ts
├─ FighterRig.ts
├─ WeaponVisual.ts
├─ ArenaLabels.ts
├─ ArenaFx.ts
├─ CameraDirector.ts
└─ ArenaPostFX.ts
```

Goals:

- viewport orchestrates only lifecycle + authoritative synchronization
- environment owns static/decorative world geometry
- rig owns fighter presentation
- weapon module owns pickup + held weapon model creation
- labels own CanvasTexture/Sprite lifecycle
- no combat rules move into presentation modules

## Next — Dependency / deployment cleanup

Completed recently:

- removed stale `pnpm-lock.yaml` that no longer matched `package.json`
- removed unused R3F / Drei / Rapier / Tailwind / clsx / lucide dependencies
- current runtime uses plain Three.js
- CI installs from current `package.json`

Follow-up:

- regenerate and commit a fresh `pnpm-lock.yaml` from a normal networked pnpm environment
- restore frozen-lockfile CI after the clean lockfile exists
- keep Vercel and GitHub Actions dependency behavior aligned

## Later — Evaluation hardening

After combat presentation reaches a stable spectator-quality baseline:

1. run 50–100 seed benchmarks on representative devices
2. record baseline timings
3. define regression thresholds
4. add artifact delete/rename/storage UI
5. define artifact migration policy
6. add optional event/audio filters

## Later — Strategic mode experiments

Only add new authoritative modes when they create measurable behavior differences:

- alternative arena layouts
- team mode
- control-point/objective mode
- hazards with real trade-offs

Visual variety alone is not enough reason to alter simulation rules.

## Later — Hardened public sandbox

The production sandbox architecture is documented in `SANDBOX.md`.

Still required before public hostile arbitrary-source execution:

- server process/container/microVM runtime
- CPU/memory/process/disk/network limits
- hard startup/per-tick deadlines
- output/log limits
- abuse controls
- deployment security review

Browser Workers remain a browser fault-isolation layer only.

## Current implementation order

```text
✓ authoritative headless engine
✓ same-tick prepare/resolve API
✓ controller submission workspace
✓ Worker-backed external controller evaluation
✓ Tournament Worker + progress/cancel
✓ partial aggregates + latency diagnostics
✓ configurable 5–100 seed evaluation
✓ ControllerLock + source identity
✓ TournamentArtifact + deep validation
✓ IndexedDB persistence/import/export
✓ shared Three.js live/replay renderer
✓ full-screen broadcast-style 3D arena
✓ CameraDirector + ArenaPostFX + ArenaFx + SFX
✓ FighterRig foundation
✓ authoritative held-weapon visuals
✓ dependency cleanup to plain Three.js
        ↓
NOW
1. discrete fighter action state machine
2. weapon-specific attack/use animation
3. directional hit / KO / respawn reactions
4. combat-pair camera choreography
5. arena readability polish
6. split ThreeArenaViewport into presentation modules
        ↓
NEXT
7. 50–100 seed target-device benchmarking
8. artifact storage-management/migrations
9. strategic arena/mode experiments
10. hardened server sandbox
```

## Product loop

```text
AI-generated controller source
        ↓
validate + inspect strategy metadata
        ↓
lock exact submissions
        ↓
choose deterministic seed set
        ↓
Tournament Worker
        ↓
per-controller Worker isolation
        ↓
same-tick authoritative evaluation
        ↓
partial aggregates + diagnostics
        ↓
behavior summary + replay records
        ↓
versioned TournamentArtifact
        ↓
IndexedDB / export / import
        ↓
Tournament Lab
        ↓
shared Three.js replay
        ↓
combat animation + camera + telemetry
```

The next phase should improve **fight readability, visible strategy differentiation and spectator quality** without weakening the authoritative engine boundary.