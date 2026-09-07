# AgentFighting Architecture

## Goal

AgentFighting is an **AI strategy simulation first** and a renderer second.

The same generated controllers must be able to run:

- with no UI for batch evaluation,
- in a lightweight 2D renderer,
- in a polished Three.js / Rapier renderer,
- in replay mode from recorded state/events.

## Dependency direction

```text
Generated Controller
        |
        v
+-------------------+
| Observation API   |
+-------------------+
        |
        v
+-------------------+
| Headless Engine   |
| - tick scheduler  |
| - movement        |
| - combat resolver |
| - weapons         |
| - chaos events    |
| - stocks / winner |
+-------------------+
        |
        +--------------------+
        |                    |
        v                    v
 Match Summary          World Snapshot
        |                    |
        v                    v
 AI post-match          Renderer Adapter
 analysis               2D / 3D / replay
```

The renderer never owns match truth.

## Tick model

Every simulation tick follows the same order:

```text
1. Advance timers / world events
2. Freeze the current world state
3. Build Observation for every living agent
4. Run every Controller against that same tick snapshot
5. Sanitize all returned Actions
6. Apply movement / dodge
7. Resolve pickup / weapon / attacks
8. Integrate world motion
9. Resolve body collision
10. Resolve stock loss / respawn / elimination / winner
11. Emit events and expose a new WorldState
```

This prevents execution-order advantage. Claude being evaluated before Codex in JavaScript does not mean Codex gets to see Claude's already-applied move.

## Determinism

A match is identified by:

```text
controller source/commit
+ engine version
+ ArenaConfig
+ seed
```

All engine randomness goes through the seeded RNG. UI animation randomness is allowed, but it cannot affect simulation state.

This gives us two useful modes:

### Replay mode

Same controllers + same seed = same simulation result.

### Tournament mode

Same controllers + many seeds = behavior distribution instead of one lucky match.

## Generated agent boundary

Models implement only:

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

They cannot import the engine, renderer, physics implementation, React, Three.js, or another controller.

`Action` is validated by `sanitizeAction()` before the engine accepts it.

Later generated code should run inside a Worker/sandbox with CPU/time/memory limits. A controller exception falls back to an idle action for that tick rather than crashing the match.

## Observation philosophy

Observation exposes facts, not conclusions.

Good:

```text
enemy position
enemy velocity
damage
distance to edge
nearby weapon type / position
recent hit events
```

Avoid:

```text
bestTarget = Claude
threatScore = 0.92
safeDirection = left
```

Those conclusions should be part of the generated strategy so different models have room to behave differently.

## Strategy diversity

The game should continuously create trade-offs where multiple choices are defensible:

```text
finish a damaged enemy
vs
escape the edge
vs
steal a weapon
vs
stay out of a multi-agent fight
```

If one rule is always optimal, all generated controllers converge and the project becomes visually repetitive.

## Match data

The engine records structured events instead of depending on video:

```text
hit
weapon-pickup
weapon-use
stock-lost
respawn
eliminated
chaos
win
```

`MatchSummary` is the stable input for post-match AI review and future behavior fingerprints.

## Renderer contract

Renderers consume `WorldState` only.

```ts
interface ArenaRenderer {
  render(state: Readonly<WorldState>): void
  onMatchEnd?(summary: MatchSummary): void
}
```

Possible implementations:

```text
Canvas2DRenderer
PixiRenderer
ThreeRenderer
ReplayRenderer
DebugRenderer
```

Changing the renderer should not require changing an agent controller or match rule.

## Current priorities

1. Headless engine correctness
2. Controller strategy freedom
3. Batch simulation and statistics
4. Replay / seed reproducibility
5. Generated-controller sandbox
6. Only then choose the final 2D/3D presentation layer
