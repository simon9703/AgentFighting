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
- ☑️ ControllerLock: immutable participant identities before evaluation

## Replay and records

- ☑️ Per-tick sanitized action recording
- ☑️ Authoritative snapshots and event recording
- ☑️ Action-only deterministic replay verification
- ☑️ Create a portable versioned tournament artifact (lock + submissions + records)
- ☐ Persist tournament artifacts as versioned JSON files
- ☐ Export a compact highlight timeline for any renderer

## Next: safe external controller execution

- ☐ Define an asynchronous runtime protocol without weakening same-tick fairness
- ☐ Add a Worker/process runtime with startup, per-tick, and memory limits
- ☐ Kill and replace a timed-out controller action with a safe fallback
- ☐ Keep trusted local compilation separate from externally submitted source

## Next: real agent tournament workflow

- ☐ Add example submissions generated from the canonical controller prompt
- ☐ Store submission source, manifest, lock, config, records, and summaries together
- ☐ Add a repeatable tournament command for a named controller set and seed range
- ☐ Generate human-readable post-match reports without changing locked controllers

## Presentation

- ☑️ Add a renderer-facing MatchSession that exposes only headless state
- ☑️ Bind the primary product experience to authoritative MatchSession state only
- ☑️ Add a responsive 2D/2.5D live arena inspector for strategy debugging
- ☐ Add replay scrubbing and highlight navigation
- ☐ Choose the final 2D / 2.5D / 3D viewing experience after engine validation
- ☐ Add richer camera, impact, weapon and chaos visual polish without moving rules into presentation

## Product completion gate

The first complete public loop is reached when a user can:

1. select or submit several generated controllers,
2. lock controller identities and source hashes,
3. run a reproducible seeded tournament,
4. watch the authoritative arena without renderer-owned rules,
5. inspect replay/highlights and behavior fingerprints,
6. export the full tournament artifact and human-readable report.
