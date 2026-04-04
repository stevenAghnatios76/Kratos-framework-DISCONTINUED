# Runtime Behavior Inventory Scanner — Subagent Prompt

> Brownfield deep analysis scan subagent. Catalogs runtime behaviors that only manifest during execution.
> Reference: Architecture ADR-021, Section 10.15.2, Section 10.15.5, ADR-022 §10.16.5
> Infra-awareness: E12-S6 — applies infra-specific patterns when project_type is infrastructure or platform.

## Objective

Scan the codebase at `{project-path}` to catalog runtime behaviors — scheduled tasks, background processes, startup hooks, shutdown handlers, and behaviors that are not visible from static code structure alone.

**Input variables:**
- `{tech_stack}` — Detected technology stack from Step 1 discovery
- `{project-path}` — Absolute path to the project source code directory
- `{project_type}` — Project type: `application`, `infrastructure`, or `platform`

**Output format:** Follow the gap entry schema at `{project-root}/_kratos/lifecycle/templates/gap-entry-schema.md` exactly.

## Detection Categories — Application Patterns

### 1. Scheduled Tasks and Cron Jobs

Detect application-level scheduled tasks:
- **Java/Spring:** `@Scheduled`, `@EnableScheduling`, Quartz `@DisallowConcurrentExecution`
- **Node/Express:** `node-cron`, `agenda`, `bull` queue scheduled jobs, `setInterval` for polling
- **Python/Django:** Celery `@periodic_task`, `celery.conf.beat_schedule`, `django-crontab`
- **Go:** `robfig/cron`, `time.Ticker`, goroutine polling loops

### 2. Startup and Shutdown Hooks

Detect application lifecycle hooks:
- **Java/Spring:** `@PostConstruct`, `@PreDestroy`, `ApplicationListener`, `CommandLineRunner`
- **Node/Express:** `process.on('SIGTERM')`, `process.on('SIGINT')`, `beforeExit`
- **Python/Django:** `AppConfig.ready()`, `atexit.register`, signal handlers
- **Go:** `os.Signal` handling, `defer` patterns in main(), `sync.Once`

### 3. Background Workers and Async Processors

Detect background processing patterns:
- Message queue consumers (Bull, SQS, Kafka, RabbitMQ consumers)
- Worker threads, child processes, goroutines for long-running tasks
- WebSocket connection handlers
- File watchers and directory monitors

### 4. Race Conditions and Concurrency Risks

Detect patterns prone to race conditions:
- Shared mutable state without synchronization
- Non-atomic read-modify-write sequences
- Missing database transaction boundaries on multi-step operations

## Detection Categories — Infrastructure Patterns (E12-S6)

**Apply ONLY when {project_type} is `infrastructure` or `platform`.**

### 5. CronJob Detection

Detect Kubernetes CronJob resources and their scheduling patterns.

**Scan for:**
- `kind: CronJob` in Kubernetes manifests
- `spec.schedule` field — extract the cron expression
- `spec.concurrencyPolicy` — flag if missing (defaults to `Allow`, may cause overlapping runs)
- `spec.startingDeadlineSeconds` — flag if missing (no deadline for missed schedules)
- `spec.successfulJobsHistoryLimit` / `spec.failedJobsHistoryLimit` — flag if set to 0 (no history retained)
- `spec.suspend` — note if suspended (informational)

**Flag these as gaps:**
- CronJobs without `concurrencyPolicy: Forbid` or `Replace` (risk of overlapping runs)
- CronJobs without `startingDeadlineSeconds` (missed jobs may accumulate)
- CronJobs without resource limits on their pod template
- CronJobs with `restartPolicy: Always` (CronJob pods should use `OnFailure` or `Never`)

**Severity:** `medium` for missing policies, `high` for incorrect restart policies

### 6. DaemonSet Detection

Detect Kubernetes DaemonSet resources and their node scheduling.

**Scan for:**
- `kind: DaemonSet` in Kubernetes manifests
- `spec.updateStrategy` — flag if missing or set to `OnDelete` (prefer `RollingUpdate`)
- `spec.template.spec.tolerations` — catalog which node taints are tolerated
- `spec.template.spec.nodeSelector` — catalog node selection criteria
- `spec.template.spec.priorityClassName` — note if using system priority classes

**Flag these as gaps:**
- DaemonSets without `updateStrategy` (defaults to `OnDelete`, requires manual pod deletion)
- DaemonSets without resource requests/limits (can starve node resources)
- DaemonSets with `hostNetwork: true` without documented justification
- DaemonSets without `terminationGracePeriodSeconds` set appropriately

**Severity:** `medium` for missing update strategy, `high` for unbounded resource usage

### 7. Init Container and Sidecar Pattern Detection

Detect init containers and sidecar container patterns in Kubernetes Pods.

**Scan for:**
- `spec.initContainers` in Pod specs — catalog each init container's purpose
- Multi-container pods where one container serves as a sidecar (log collector, proxy, metrics agent)
- Istio/Envoy sidecar injection annotations: `sidecar.istio.io/inject: "true"`
- Init containers that run database migrations, config loading, or secret fetching
- Sidecar containers for: logging (fluentd, filebeat), monitoring (prometheus exporter), proxying (envoy, nginx)

**Flag these as gaps:**
- Init containers without resource limits (can block pod startup indefinitely)
- Init containers without timeout or failure handling
- Sidecar containers without health checks (liveness/readiness probes)
- Multi-container pods without clear documentation of container roles

**Severity:** `medium` for missing resource limits, `low` for missing documentation

### 8. Health Probe Detection (Liveness, Readiness, Startup)

Detect the presence and configuration of Kubernetes health probes.

**Scan for:**
- `livenessProbe` — checks if the container is running; restarts on failure
- `readinessProbe` — checks if the container can serve traffic; removes from service on failure
- `startupProbe` — checks if the application has started; disables liveness/readiness until success

**Flag these as gaps:**
- Containers without `livenessProbe` (no automatic restart on hang)
- Containers without `readinessProbe` (may receive traffic before ready)
- Long-starting containers without `startupProbe` (liveness probe may kill them during startup)
- Probes with `initialDelaySeconds: 0` and no `startupProbe` (may restart healthy containers during startup)
- Probes using `exec` commands that could be expensive (e.g., database queries as health checks)
- Liveness and readiness probes pointing to the same endpoint (if the endpoint is slow, both fail simultaneously)
- Missing `periodSeconds`, `timeoutSeconds`, `failureThreshold` customization (relying on defaults may not suit the workload)

**Severity:** `high` for missing liveness/readiness probes, `medium` for suboptimal probe configuration

## Output Format

Gap entry structure uses `category: "runtime-behavior"` with `id: "GAP-RUNTIME-{seq}"`.
For infra-specific findings, include "[INFRA]" prefix in the title for clarity.
Budget: max 70 entries, truncate low-severity if exceeded.

## Output File

Write all findings to: `{planning_artifacts}/brownfield-scan-runtime-behavior.md`
