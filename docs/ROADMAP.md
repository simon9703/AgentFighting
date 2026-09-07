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
- ☐ Persist match artifacts as versioned JSON files
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
- ☐ Bind the existing prototype renderer to authoritative replay state only
- ☐ Add a minimal 2D replay inspector for debugging and strategy analysis
- ☐ Choose the final 2D / 2.5D / 3D viewing experience after engine validation
- ☐ Add camera, impact, and visual polish only after the strategy loop is stable
