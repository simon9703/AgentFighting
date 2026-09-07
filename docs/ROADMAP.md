# AgentFighting Roadmap

## Foundation

- ☑️ Headless authoritative arena engine
- ☑️ Same-tick observation and action resolution
- ☑️ Seeded RNG and reproducible match configuration
- ☑️ Combat, stocks, weapons, chaos events, and match summary
- ☑️ Renderer-agnostic contracts

## Controller workflow

- ☑️ `Observation -> Action` controller contract
- ☑️ Action sanitization and controller-failure fallback
- ☑️ Submission schema, source policy, and stable source hash
- ☑️ Local trusted compiler for development only
- ☑️ Tournament evaluation across multiple seeds
- ☑️ Behavior fingerprint aggregation
- ☑️ ControllerLock with stable lock hash before evaluation

## Replay and records

- ☑️ Per-tick sanitized action recording
- ☑️ Authoritative snapshots and event recording
- ☑️ Action-only deterministic replay verification
- ☑️ Portable versioned tournament artifact (lock + submissions + records + summaries)
- ☑️ Downloadable versioned JSON tournament artifact
- ☑️ Compact highlight timeline for any renderer

## External controller execution boundary

- ☑️ Async runtime protocol that preserves collect-before-resolve same-tick fairness
- ☑️ Browser Worker runtime with startup isolation
- ☑️ Per-tick timeout, Worker termination and safe neutral fallback
- ☑️ Trusted local compilation kept separate from external runtime primitives
- ☐ Add server process/container runtime with strict memory accounting for fully untrusted public submissions

## Real agent tournament workflow

- ☑️ Canonical example controller submissions with distinct strategy manifests
- ☑️ Store submission source, manifest, lock, config, records, fingerprints and summaries together
- ☑️ Interactive repeatable seeded tournament workflow in `/tournament`
- ☑️ Human-readable post-match Markdown reports without changing locked controllers
- ☐ Add CLI command for CI/headless named tournament sets

## Presentation

- ☑️ Renderer-facing MatchSession that exposes only headless state
- ☑️ Primary live experience bound to authoritative MatchSession state only
- ☑️ Responsive 2D/2.5D live arena inspector
- ☑️ Replay scrubbing across every recorded authoritative tick
- ☑️ Highlight navigation into replay ticks
- ☑️ Behavior Fingerprint comparison UI
- ☑️ Tournament artifact and report export UI
- ☑️ 2.5D is the primary first-version presentation; renderer remains replaceable
- ☐ Add richer impact, weapon and chaos animation without moving rules into presentation

## First-version product loop

The repository now demonstrates the complete local/reproducible loop:

1. generated-style controller submissions declare source + strategy manifests,
2. controller identities and source hashes are locked before evaluation,
3. the same locked controllers run across a deterministic seed set,
4. the live arena consumes authoritative engine state rather than renderer-owned rules,
5. tournament results expose Behavior Fingerprints rather than only a winner,
6. every recorded match can be scrubbed and navigated by highlights,
7. the full JSON artifact and human-readable Markdown report can be exported.

The remaining security milestone is deployment-grade execution of arbitrary untrusted public source with hard process/container memory limits. That is an infrastructure hardening step, not a dependency of the local product/architecture loop.
