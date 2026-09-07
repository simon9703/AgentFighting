# AgentFighting

AgentFighting is a renderer-agnostic AI behavior arena. Multiple models generate **one controller each**, those controllers are locked before evaluation, and the same fixed code reacts to a changing shared world every simulation tick.

The project is not intended to be a serious model benchmark. Its value is in making agent behavior observable: strategy, mistakes, risk-taking, recovery, weapon choice, targeting, survival and emergent interaction.

## What exists today

AgentFighting v1 already supports the full local evaluation loop:

```text
Controller submissions
        ↓
validate source + manifest
        ↓
create stable source/controller identities
        ↓
ControllerLock
        ↓
run many deterministic seeded matches
        ↓
authoritative WorldState + events + stats
        ↓
MatchRecord / replay / highlights
        ↓
Behavior Fingerprint
        ↓
Tournament artifact + Markdown report
```

The web app currently exposes two product surfaces:

- `/` — live authoritative arena viewer
- `/tournament` — seeded tournament lab, behavior fingerprints, replay scrubbing, highlights and export

## Architecture

```text
agents/
  built-in reference agents
  canonical sample submissions

features/controllers/
  generation prompt
  submission schema
  source validation
  stable controller/source identity
  trusted local compiler

features/sandbox/
  controller runtime boundary
  in-process runtime for trusted code
  async same-tick action collection
  browser Worker runtime for external code

features/engine/
  authoritative simulation
  observations and action sanitization
  movement / combat / weapons / stocks / chaos
  deterministic RNG
  match summary and tournament aggregation

features/replay/
  MatchRecord schema
  per-tick actions and snapshots
  deterministic replay verification
  highlight timeline

features/evaluation/
  ControllerLock
  submission tournament pipeline
  portable TournamentArtifact
  Markdown report generation

features/renderers/
  passive renderer-facing adapters/view models

features/arena/
  current live 2D/2.5D arena presentation

features/tournament/
  Tournament Lab product UI
```

The dependency direction is deliberate: **presentation never owns match truth**.

## Core invariants

- every active controller observes the same pre-action snapshot for a tick
- all actions are collected before authoritative resolution
- controller outputs are sanitized
- engine randomness comes only from seeded RNG
- renderers cannot mutate combat, stocks, chaos or winner state
- a controller exception or timeout must not crash the match
- externally supplied controller code must not be treated as trusted local code
- controller identity is locked before seeded evaluation begins

## Controller contract

```ts
interface AgentController {
  act(observation: Readonly<Observation>): Action
}
```

Controllers may keep private memory in their closure, but they do not call an LLM again during the match.

A model submission includes:

- `agentId`
- model name
- strategy manifest
- self-contained JavaScript controller source

The source receives stable hashes/identities so a replay can identify exactly which controller participated.

## Evaluation and replay

`evaluateControllerSubmissions()` is the trusted local end-to-end evaluation entry point. It validates submissions, creates a `ControllerLock`, runs the same participant set across many seeds, aggregates behavior fingerprints, and produces independently replayable `MatchRecord`s.

A portable tournament artifact contains:

- schema version
- controller lock and hashes
- original submissions and manifests
- tournament seeds/config
- match summaries
- behavior fingerprints
- replay records

Replay is simulation data, not recorded video. Any future renderer can consume the same records.

## Runtime safety

`compileTrustedControllerSource()` uses `new Function` only for trusted local development. It is **not a sandbox**.

For external controller code, the project now has a browser Worker runtime and an asynchronous same-tick collection protocol with startup/per-tick timeout handling and neutral fallback actions. This is suitable for browser isolation and architecture validation, but it is not a hardened hostile multi-tenant sandbox.

A production public submission service still needs process/container isolation, hard resource quotas and server-side admission controls.

## Current game rules

The initial environment is a Smash/Fall-Guys-like arena:

- 4–8 agents
- stock-based survival
- movement, dodge, normal attack and heavy attack
- hammer, shield, push gun and bomb
- ice, wind, low gravity and shrinking arena events
- body collisions and knockback

The environment should continuously create trade-offs rather than one globally dominant strategy.

## Run

```bash
pnpm install
pnpm dev
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/tournament`

## Verify

```bash
pnpm check
```

This runs both TypeScript checking and the production Next.js build.

## Project status

The v1 architecture and local product loop are considered complete enough to freeze. New work should not add duplicate game rules or another evaluation path.

The next phase is **Submission Platform + Scalable Evaluation + Renderer Polish**. See [`docs/PLAN.md`](./docs/PLAN.md).

For architectural constraints and agent-facing development rules, see [`agent.md`](./agent.md) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
