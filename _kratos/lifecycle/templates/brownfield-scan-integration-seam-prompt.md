# Integration Seam Analyzer — Subagent Prompt

> Brownfield deep analysis scan subagent. Traces data flows across service boundaries and detects fragile integration points.
> Reference: Architecture ADR-021, Section 10.15.2, Section 10.15.5, ADR-022 §10.16.5
> Infra-awareness: E12-S6 — applies infra-specific patterns when project_type is infrastructure or platform.

## Objective

Scan the codebase at `{project-path}` to trace data flows across service boundaries, detect fragile integration points, tight coupling, and missing contracts. For infrastructure projects, additionally map service mesh topology, ingress/egress routes, and cross-namespace dependencies.

**Input variables:**
- `{tech_stack}` — Detected technology stack from Step 1 discovery
- `{project-path}` — Absolute path to the project source code directory
- `{project_type}` — Project type: `application`, `infrastructure`, or `platform`

**Output format:** Follow the gap entry schema at `{project-root}/_kratos/lifecycle/templates/gap-entry-schema.md` exactly.

## Detection Categories — Application Patterns

### 1. HTTP Client Calls (Service-to-Service)

Detect outbound HTTP/REST calls:
- **Java/Spring:** Feign clients, RestTemplate, WebClient, HttpClient
- **Node/Express:** axios, fetch, got, node-fetch, superagent
- **Python/Django:** requests, httpx, urllib3, aiohttp
- **Go:** net/http.Client, resty, go-retryablehttp

### 2. Message Queue Integration

Detect message queue producers/consumers:
- Bull, BullMQ, RabbitMQ (amqplib), Kafka (kafkajs, confluent-kafka), Celery, SQS, NATS

### 3. Database Shared Access

Detect multiple services or modules accessing the same database tables.

### 4. Coupling Classification

Classify coupling issues:
- Tightly coupled: shared DB tables, direct internal API calls
- Missing circuit breaker or retry logic
- Undocumented external service dependencies
- Inconsistent serialization formats

### 5. Dependency Graph

Generate adjacency list showing service-to-service relationships with connection type and direction.

## Detection Categories — Infrastructure Patterns (E12-S6)

**Apply ONLY when {project_type} is `infrastructure` or `platform`.**

### 6. Service Mesh Topology Mapping

Detect and map service mesh configurations and their routing rules.

**Scan for:**
- **Istio:** VirtualService, DestinationRule, Gateway, ServiceEntry, PeerAuthentication
  - `kind: VirtualService` — extract routing rules, traffic splitting percentages, timeout configs
  - `kind: DestinationRule` — extract load balancing policies, circuit breaker settings, TLS modes
  - `kind: Gateway` — extract ingress listeners, TLS configuration, host matching
  - `kind: ServiceEntry` — extract external service registrations
  - `kind: PeerAuthentication` — extract mTLS modes (STRICT, PERMISSIVE, DISABLE)
- **Linkerd:** ServiceProfile, TrafficSplit, Server, ServerAuthorization
- **Consul Connect:** ServiceIntention, ServiceRouter, ServiceSplitter, ServiceResolver

**Flag these as gaps:**
- VirtualService without timeout configuration (unbounded request duration)
- DestinationRule without circuit breaker settings (no fault isolation)
- PeerAuthentication in PERMISSIVE mode in production (allows plaintext traffic)
- ServiceEntry for external services without failover configuration
- Traffic splitting percentages that do not sum to 100%
- Missing retryOn policies for transient failure codes (5xx, connect-failure)

**Severity:** `high` for missing circuit breakers and timeouts, `medium` for permissive mTLS

### 7. Ingress/Egress Route Mapping

Map all ingress and egress routes to understand traffic flow in and out of the cluster.

**Scan for:**
- Kubernetes Ingress resources: hosts, paths, backend services, TLS config
- Istio Gateway + VirtualService pairs: external entry points into the mesh
- AWS ALB Ingress Controller annotations: `alb.ingress.kubernetes.io/*`
- Nginx Ingress Controller annotations: `nginx.ingress.kubernetes.io/*`
- Egress rules: NetworkPolicy egress, Istio ServiceEntry for external services, Calico GlobalNetworkPolicy
- NAT Gateway / Internet Gateway configurations in Terraform

**Flag these as gaps:**
- Ingress routes without TLS/HTTPS enforcement
- Ingress to services that are also exposed via NodePort (dual exposure)
- Missing egress restrictions (all outbound traffic allowed by default)
- External service dependencies without explicit ServiceEntry or egress policy
- Ingress paths that bypass the service mesh (direct NodePort access)

**Severity:** `high` for missing TLS and unrestricted egress, `medium` for dual exposure

### 8. Cross-Namespace Dependency Detection

Detect service dependencies that span Kubernetes namespaces.

**Scan for:**
- Service references using FQDN: `{service}.{namespace}.svc.cluster.local`
- ExternalName services pointing to other namespaces
- NetworkPolicy rules referencing `namespaceSelector`
- Istio VirtualService/DestinationRule targeting services in other namespaces
- ConfigMap or Secret references from other namespaces (via volume mounts or env)
- ServiceAccount tokens shared across namespaces

**Flag these as gaps:**
- Cross-namespace service calls without NetworkPolicy allowing the traffic
- Cross-namespace dependencies without documented ownership or SLA
- Hardcoded namespace names in service URLs (fragile to namespace renaming)
- Cross-namespace secret sharing without RBAC scoping
- Circular cross-namespace dependencies (A -> B -> A)

**Severity:** `high` for undocumented cross-namespace dependencies, `medium` for hardcoded namespaces

## Output Format

Gap entry structure uses `category: "integration-seam"` with `id: "GAP-INTEGRATION-{seq}"`.
For infra-specific findings, include "[INFRA]" prefix in the title for clarity.
Budget: max 70 entries, truncate low-severity if exceeded.

## Output File

Write all findings to: `{planning_artifacts}/brownfield-scan-integration-seam.md`
