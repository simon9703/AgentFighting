# Production Sandbox Architecture

## Scope

The browser Worker path is a fault-isolation and product-validation boundary. It is **not** the security boundary for hostile public multi-tenant submissions.

A public AgentFighting service should execute each locked controller inside a server-side process/container/VM boundary while preserving the same logical protocol already used by the browser coordinator:

```text
locked controller source
        ↓
isolated controller runtime
        ↓
Observation N → Action N
        ↓
authoritative engine resolves all Action N together
```

The authoritative engine never runs inside controller sandboxes and controller runtimes never mutate `WorldState`.

## Runtime protocol

A production runtime only needs four logical operations:

```ts
interface IsolatedControllerRuntime {
  start(input: {
    controllerId: string
    source: string
    sourceHash: string
  }): Promise<void>

  act(input: {
    tick: number
    observation: Observation
    deadlineMs: number
  }): Promise<Action | null>

  health(): Promise<RuntimeHealth>
  terminate(reason: string): Promise<void>
}
```

Transport may be stdio, Unix socket, local RPC or a sandbox service. The transport is not part of match semantics.

## Isolation model

Recommended production hierarchy:

```text
Evaluation Coordinator
  ├─ authoritative engine process
  ├─ Controller A sandbox
  ├─ Controller B sandbox
  ├─ Controller C sandbox
  └─ Controller D sandbox
```

Prefer one sandbox per controller identity for a match. A sandbox can retain controller-private memory across ticks in the same match, but must be recreated/reset between independent seeded matches unless the evaluation contract explicitly says otherwise.

## Required resource limits

Initial conservative limits should be configurable and recorded with the evaluation metadata.

| Resource | Required control | Failure behavior |
| --- | --- | --- |
| source size | admission limit, currently aligned with controller schema | reject before lock/evaluation |
| startup wall time | hard deadline | terminate runtime, mark failed |
| per-tick wall time | hard deadline | neutral action, count timeout |
| CPU | cgroup/job/process quota | terminate on quota breach |
| memory | hard container/process limit | terminate on OOM/quota breach |
| processes/threads | strict low limit | deny/terminate |
| filesystem | read-only minimal root or none | deny writes except isolated scratch if required |
| scratch disk | small quota | terminate/clean |
| network | disabled by default | deny all egress/ingress |
| stdout/stderr | byte/rate cap | truncate and record diagnostic |
| action payload | schema + byte cap | sanitize/fallback |
| lifetime | match-scoped maximum | terminate at match end |

No controller should receive credentials, host environment variables, repository secrets or direct database access.

## Determinism and fairness

For tick N:

```text
engine.prepareTick()
      ↓
one immutable Observation N per active controller
      ↓
dispatch concurrently with the same deadline policy
      ↓
timeout/error → neutral sanitized action
      ↓
engine.resolvePreparedTick(all accepted actions)
```

Controller completion order must not affect resolution order or what another controller observes.

A timeout is evaluation evidence, not a reason to extend another controller's deadline.

## Admission checks

Before starting a sandbox:

1. parse `ControllerSubmission`
2. enforce source-size limit
3. run static source policy
4. create/verify `sourceHash` and `controllerId`
5. create the canonical `ControllerLock`
6. store the exact locked bytes used for execution
7. reject duplicate agent IDs

Static policy is defense in depth, not the security boundary. The sandbox must remain safe if static analysis misses an escape attempt.

## Runtime diagnostics

Diagnostics are non-authoritative metadata and should include:

- controller ID / source hash
- startup duration
- per-tick execution duration distribution
- timeout count
- exception count
- termination reason
- peak memory
- CPU consumed
- truncated stderr/stdout summary
- sandbox/runtime version

Diagnostics must not change historical replay state. Replay records contain the accepted sanitized actions and authoritative snapshots.

## Failure semantics

Controller failure must be local:

```text
controller throws / crashes / times out / exceeds quota
        ↓
runtime terminates or becomes unavailable
        ↓
current tick receives neutral action
        ↓
future ticks receive neutral action unless policy allows one clean restart
        ↓
other controllers and authoritative engine continue
```

The default public policy should avoid repeated automatic restarts because restart behavior can alter controller-private memory and complicate reproducibility.

## Candidate technologies

The runtime contract deliberately does not mandate one implementation. Viable options include:

- dedicated OS processes with namespaces/cgroups/seccomp
- OCI containers with strict profiles and no network
- microVMs for stronger tenant boundaries
- a managed sandbox service implementing the same RPC contract

Selection should be based on isolation guarantees, startup cost, observability, density and operational complexity—not on changing the engine API.

## Browser versus production

| Browser path | Production path |
| --- | --- |
| Dedicated Worker per controller | process/container/VM per controller |
| Tournament Worker keeps UI responsive | server evaluation coordinator |
| startup/per-tick wall timeout | wall + CPU + memory + process quotas |
| source policy + Worker isolation | source policy + hardened OS/runtime isolation |
| suitable for local experiments | suitable for hostile public submissions after security review |

Do not describe browser Workers, `new Function`, iframe isolation or client-side validation as a secure public-code sandbox.

## Deployment gate

Public arbitrary-source submissions should stay disabled until all of the following exist:

- hardened isolated runtime implementation
- network disabled by default
- CPU/memory/process limits
- startup/per-tick deadlines
- output/action size limits
- runtime telemetry
- abuse/rate limits at the service boundary
- cleanup guarantees
- security review and escape testing

Until then, the browser Worker workflow is the supported external-code experimentation path.
