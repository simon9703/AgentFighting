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
- selection focus state
- chaos-reactive lighting
- adaptive high/low quality profiles
- reduced-motion support
- DPR-safe canvas sizing so the complete arena fills the viewport instead of rendering only a cropped quadrant
- stabilized broadcast framing instead of constant ambient orbiting
- damped fighter facing to remove velocity-driven left/right jitter
- stronger fighter material contrast, silhouette and emissive accents
- brighter arena/fighter separation for clearer team-color readability

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
  - spectator/broadcast framing
  - restrained impact shake instead of continuous visual instability
- `ArenaPostFX`
  - bloom
  - vignette
  - hit flash
  - restrained energy/chromatic distortion
- procedural event SFX from public `MatchEvent`s only

## Completed foundation — Fighter presentation rig

The renderer-only `FighterRig` layer is separated from `ThreeArenaViewport`.

Current rig behavior:

```text
authoritative movement
→ visible stride cycle
→ alternating leg motion
→ arm counter-swing
→ body lean / body bob
→ damped facing

authoritative intent/event
→ attack wind-up / strike / recovery pose
→ heavier two-stage attack pose
→ dodge pose
→ hit recoil
→ KO lean
→ respawn pulse
```

Held weapons are rendered from authoritative `fighter.weapon` state:

- hammer
- shield
- bomb
- push gun

No rig animation affects engine motion, collision, hit resolution, damage or stocks.

## Current focus — Combat locomotion and action readability

This is the highest-priority product work. The main remaining gap is no longer basic rendering; it is making authoritative AI decisions visually read as an actual fight.

The target presentation pipeline is:

```text
idle
  ↓
walk / run / strafe
  ↓
approach target
  ↓
attack.windup
  ↓
attack.active
  ↓
attack.recovery
  ↓
resume locomotion / reposition
```

Interrupted branches:

```text
dodge
hit → knockback
stock-lost → launch / fall
eliminated → KO / removal
respawn → re-entry / landing
```

### A. Explicit fighter presentation state machine

Replace loosely coupled continuous pose reactions with an explicit renderer-only state machine.

Required states:

```text
idle
walk
run
strafe
approach
attack.windup
attack.active
attack.recovery
heavy.windup
heavy.active
heavy.recovery
dodge
hit
knockback
ko
respawn
```

Goals:

- locomotion must be visibly distinct from standing idle
- fighters should approach opponents without appearing to slide
- low-speed direction noise must not rotate the whole body every frame
- facing should prefer meaningful movement/attack targets rather than raw instantaneous velocity
- attacks must visually read as discrete actions
- attack wind-up must clearly raise/prepare the striking arm or weapon
- attack active frames must produce a readable forward strike
- recovery must return naturally to locomotion rather than snapping to idle
- heavy attacks need clear charge → release → follow-through → recovery
- dodge needs directional posture and burst movement presentation
- hit reaction should include directional recoil
- KO should communicate launch/fall/removal
- respawn should include a readable re-entry/landing moment

All timing remains derived from authoritative snapshots/events. The renderer never decides whether an attack lands.

### B. Target-aware facing and movement presentation

Introduce a stable facing policy separate from raw motion interpolation.

Priority:

```text
active attack target
→ recent combat target
→ meaningful movement direction
→ retain previous facing
```

Implementation goals:

- angular damping with shortest-angle interpolation
- dead zone for tiny velocity changes
- minimum facing hold time during attack phases
- no 180° flip-flop from per-tick steering noise
- walk/run animation speed based on rendered displacement, not noisy raw velocity alone
- optional side-step/strafe pose when motion direction differs strongly from facing

### C. Weapon-specific animation

Implement distinct held-weapon presentation:

- hammer: raise → large swing → heavy follow-through
- shield: raise / brace / absorb pose
- push gun: aim → fire → recoil
- bomb: lift → throw → release arc / FX

Weapon use visuals consume existing authoritative weapon state/events. Do not add renderer-owned weapon rules.

### D. Event reaction layer

Keep per-fighter transient presentation reactions:

```text
Map<fighterId, {
  attack,
  heavy,
  dodge,
  hit,
  knockback,
  ko,
  respawn
}>
```

Next improvements:

- derive hit recoil direction from actor/target positions
- distinguish normal hit, stock loss and final elimination
- emphasize successful heavy hits
- distinguish weapon-use reactions by weapon type
- add short hit-stop / impact emphasis in presentation only
- avoid replay divergence by deriving every trigger from recorded public events/state

### E. Combat-pair camera choreography

Only after locomotion/action phases are stable:

- frame nearby attacker + target together
- maintain enough arena context to understand positioning
- brief heavy-hit push-in
- weapon-use emphasis
- KO tracking without losing surviving fighters
- highlight replay camera presets
- selected fighter follow mode
- reduced-camera-shake toggle independent of OS preference

Camera movement must never obscure action readability for decorative effect.

### F. Fighter visual redesign pass

The current procedural mech is now usable but remains a placeholder presentation asset.

Near-term procedural improvements:

- stronger head/body/limb silhouette separation
- larger readable hands/forearms for attack poses
- more obvious front/back orientation
- brighter team-color accents with dark neutral armor base
- opaque materials by default; transparency reserved for FX only
- clearer selected-fighter outline/ring
- simpler labels while fighters are in close combat

Later asset upgrade:

- support GLTF/GLB rigged fighter models behind the same renderer contract
- map presentation states onto `AnimationMixer` clips
- retain procedural fallback for low quality/mobile mode
- never couple asset skeletons to engine rules

### G. Arena and theme readability

Improve the world only where it helps strategy and viewing:

- lighter midtones so dark fighters do not disappear into the arena
- one dominant cool neutral environment palette
- team/fighter colors reserved primarily for characters, labels and combat FX
- clearer arena boundary/death edge
- clearer cover readability
- better weapon spawn readability
- restrained chaos environment animation
- reusable arena-theme primitives

Do not add decorative geometry, bloom or transparency that hides fighters or confuses authoritative collision boundaries.

## Next — Multiplayer readability pass

After 1v1/low-count combat reads correctly, validate 4–8 fighter chaos scenarios.

Goals:

- no overlapping world labels covering combat
- selected fighter remains identifiable at all times
- attacks from different fighters can be visually separated
- local combat clusters are readable without zooming the camera into only one corner
- KO/weapon effects do not flood the whole screen
- arena framing remains complete at desktop and mobile aspect ratios

Potential techniques:

- distance-aware label scale/visibility
- priority labels for selected/recently-hit fighters
- capped simultaneous transient FX
- combat-cluster camera target with arena-bound constraints
- per-fighter color accents plus neutral body materials

## Next — Code organization cleanup

`ThreeArenaViewport.tsx` is still too large. Once the locomotion/action behavior stabilizes, extract:

```text
ThreeArenaViewport
├─ ArenaEnvironment.ts
├─ FighterPresentationState.ts
├─ FighterRig.ts
├─ FighterFacing.ts
├─ WeaponVisual.ts
├─ ArenaLabels.ts
├─ ArenaFx.ts
├─ CameraDirector.ts
└─ ArenaPostFX.ts
```

Goals:

- viewport orchestrates only lifecycle + authoritative synchronization
- environment owns static/decorative world geometry
- presentation state owns renderer-only action phase transitions
- rig owns fighter mesh/skeleton posing
- facing owns target-aware angular smoothing
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
✓ DPR/canvas crop fix
✓ stable overview camera baseline
✓ higher-contrast fighter/theme pass
✓ damped facing + visible walk/attack pose baseline
✓ dependency cleanup to plain Three.js
        ↓
NOW
1. explicit locomotion/action presentation state machine
2. target-aware facing + approach/strafe presentation
3. weapon-specific attack/use animations
4. directional hit / knockback / KO / respawn reactions
5. combat-pair camera choreography
6. fighter silhouette/theme readability refinement
7. 4–8 fighter multiplayer readability validation
8. split ThreeArenaViewport into presentation modules
        ↓
NEXT
9. GLTF/AnimationMixer fighter asset path with procedural fallback
10. 50–100 seed target-device benchmarking
11. artifact storage-management/migrations
12. strategic arena/mode experiments
13. hardened server sandbox
```

## Acceptance criteria for the current visual phase

Before leaving the combat-presentation phase, the default arena should satisfy all of the following:

- the full arena is visible at common desktop and mobile aspect ratios
- fighters remain readable against the environment without relying on transparency
- a moving fighter visibly walks/runs instead of sliding
- a fighter does not continuously jitter or rotate from steering noise
- normal and heavy attacks are distinguishable without reading the HUD
- the striking arm/weapon visibly raises before the hit phase
- hit direction and knockback are visually understandable
- KO and respawn are visually distinct from ordinary damage
- the camera does not hide 75% of the arena or constantly shake/orbit
- selected fighter remains identifiable during multi-fighter combat
- replay derives the same presentation triggers from recorded authoritative events
- renderer-only states never change engine outcomes

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
combat locomotion + action state + camera + telemetry
```

The next phase should improve **fight readability, visible strategy differentiation and spectator quality** without weakening the authoritative engine boundary.