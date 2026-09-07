# AgentFighting — Agent Development Guide

## Goal

AgentFighting is an AI behavior arena, not a serious model benchmark and not primarily a fighting-game UI project.

The core product loop is:

```text
same task + same API
        ↓
multiple models generate one controller each
        ↓
controllers are locked before the match
        ↓
all controllers act inside the same dynamic world
        ↓
physics / combat / weapons / random events / other agents interact
        ↓
match result + behavior data + replay
```

The interesting output is the process: emergent strategies, mistakes, rivalries, risk-taking, recovery, weapon choices, and chaotic interaction. Winning is useful, but entertainment and behavioral diversity are more important than ranking models.

## Product principles

1. **One-shot code generation**
   - A model generates its controller once before the match.
   - No LLM calls are required during the match.
   - The same controller may keep internal state across ticks.

2. **Realtime behavior from fixed code**
   - Controller code is fixed, but its behavior is not.
   - Every tick receives a fresh observation of the current world.
   - The world changes because of combat, collisions, weapons, random events, and other agents.

3. **No hidden strategy in the engine**
   - Observation should expose facts, not conclusions.
   - Do not expose fields such as `bestTarget`, `dangerScore`, `optimalPath`, or `recommendedAction`.
   - Controllers should decide who is dangerous, whether to attack, retreat, loot, camp, or take risks.

4. **Same-tick fairness**
   - Every active controller observes the same authoritative world snapshot for tick N.
   - All actions are collected first.
   - Actions are then resolved together into world state N+1.
   - Never step physics after agent A before asking agent B for its action.

5. **Deterministic simulation where practical**
   - Randomness must come from a seeded RNG owned by the engine.
   - A match should be reproducible from controller versions + engine version + config + seed.
   - `Math.random()` must not be used inside authoritative engine logic.

6. **Renderer is replaceable**
   - 2D Canvas, Pixi, Three.js, React Three Fiber, or another renderer are presentation choices.
   - Renderers subscribe to world snapshots/events.
   - Renderers must not decide damage, collision results, random events, stocks, respawn, or winners.

7. **Headless first**
   - The engine must be able to run without DOM, WebGL, React, or Three.js.
   - We should be able to run 1, 10, or 1000 seeded matches in batch for strategy analysis.

## Current game design

Initial mode: physics brawl / chaos arena.

- 4–8 agents in one arena
- stock-based survival rather than instant permanent death
- movement, dodge, normal attack, heavy attack
- weapons such as hammer, shield, push gun, bomb
- random global events such as ice, wind, low gravity, shrinking arena
- agents can collide and indirectly change each other's future observations

The game should favor trade-offs rather than one dominant rule. For example:

```text
attack weak enemy
vs
pick up weapon
vs
move toward center
vs
escape edge
vs
avoid current hazard
```

If one simple policy dominates every state, controller diversity will collapse.

## Architecture

```text
agents/
  generated or sample controllers

features/engine/
  authoritative world state
  observation creation
  action sanitization
  tick scheduling
  movement/combat/weapons/events
  deterministic RNG
  tournament analysis

features/sandbox/
  controller execution boundary
  trusted in-process runtime for development
  isolated runtime adapter for generated code later

features/replay/
  match record format
  tick/action/event/snapshot recording
  replay/export helpers

features/evaluation/
  validates locked ControllerSubmissions
  creates a portable ControllerLock before any match runs
  compiles them at the execution boundary
  runs many seeded matches
  returns fingerprints plus replayable records

features/renderers/
  passive renderer contracts

features/arena/
  current visual prototype only; should consume engine state rather than own rules
```

## Controller contract

Controllers depend only on engine types.

```ts
interface AgentController {
  act(observation: Observation): Action
}
```

Controllers may keep private state:

```ts
function createController(): AgentController {
  let targetId: string | null = null
  let mode = 'neutral'

  return {
    act(obs) {
      // update memory and choose an action
    }
  }
}
```

A controller must not:

- import React/Three/Rapier
- mutate world state directly
- access another controller's internal state
- call engine internals
- use network/filesystem APIs during a match
- depend on wall-clock time

## Observation design

Prefer raw facts:

- self position / velocity / damage / stocks / cooldowns
- nearby or visible enemy state
- current weapon
- available weapon positions/types
- arena bounds / safe area / current chaos event
- recent public combat events

Avoid precomputed strategic labels.

## Action design

Keep the action surface small and expressive. Initial actions:

- moveX / moveZ
- attack
- heavyAttack
- dodge
- pickup
- useWeapon
- aim
- optional short `intent` string for UI/debugging

`intent` is a declared action label, not chain-of-thought.

## Controller safety

All controller outputs must be sanitized before resolution.

- clamp numeric ranges
- default missing fields
- reject NaN / Infinity
- catch controller exceptions
- apply per-tick execution limits in isolated runtimes
- never let one controller crash the whole match

The engine must depend on a `ControllerRuntime` abstraction rather than a specific JavaScript sandbox implementation.

The first local source compiler is deliberately named `compileTrustedControllerSource`.
It performs policy validation and freezes observations, but `new Function` is **not**
a security boundary. Never describe it as a safe sandbox. Any externally submitted
controller must move to a Worker/process runtime with resource limits before it is
accepted from users.

## Match records and replay

A replayable match should contain at least:

- schema version
- engine version
- seed
- match config
- controller identifiers / source hashes
- initial world state
- per-tick sanitized actions
- authoritative events
- periodic or per-tick snapshots
- final result and statistics

Replay is not a video. It is deterministic simulation data that any renderer can consume.

## Strategy evaluation

Do not infer a model's style from one match only.

Run the same controller over many seeds and aggregate:

- win rate
- average rank
- attacks / hits / accuracy
- damage dealt / taken
- weapon pickups / uses
- edge exposure
- movement / survival behavior
- target concentration
- chaos-event survival

Expose this as a Behavior Fingerprint rather than a single benchmark score.

## Development priority

Current order of work:

1. Headless authoritative engine
2. Controller API and execution boundary
3. deterministic seed/replay/match record
4. strategy/tournament metrics
5. generated-controller workflow and reproducible batch evaluation
6. isolated Worker/process runtime for external controller source
7. renderer integration
8. final visual polish / 2D vs 3D choice

Do not spend significant time polishing rendering if the headless architecture or controller strategy space is still unstable.
