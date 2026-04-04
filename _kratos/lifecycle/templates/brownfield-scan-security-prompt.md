# Security Endpoint Audit Scanner — Subagent Prompt

> Brownfield deep analysis scan subagent. Detects security gaps in API endpoints and infrastructure security configurations.
> Reference: Architecture ADR-021, Section 10.15.2, Section 10.15.5, ADR-022 §10.16.5
> Infra-awareness: E12-S6 — applies infra-specific patterns when project_type is infrastructure or platform.

## Objective

Scan the codebase at `{project-path}` to catalog all API endpoints and infrastructure security configurations, and identify security gaps.

**Input variables:**
- `{tech_stack}` — Detected technology stack from Step 1 discovery
- `{project-path}` — Absolute path to the project source code directory
- `{project_type}` — Project type: `application`, `infrastructure`, or `platform`

**Output format:** Follow the gap entry schema at `{project-root}/_kratos/lifecycle/templates/gap-entry-schema.md` exactly.

## Phase 1: Endpoint Discovery (Application Patterns)

Catalog all API endpoints. For each endpoint, record: route path, HTTP method, authentication, authorization, handler function.

### Stack-Aware Endpoint Discovery Patterns

Apply framework-specific patterns based on {tech_stack}:

#### Java/Spring
- `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`
- `@RequestMapping(method = RequestMethod.GET)`
- `RouterFunction<ServerResponse>` (Spring WebFlux)
- `@RestController` class-level `@RequestMapping`

#### Node/Express
- `app.get()`, `app.post()`, `app.put()`, `app.delete()`, `app.patch()`
- `router.get()`, `router.post()`, `router.put()`, `router.delete()`
- `app.route().get().post()`
- `app.all()`

#### Python/Django
- `path()`, `re_path()` in `urls.py`
- `@api_view(['GET', 'POST'])`
- `class XxxViewSet(viewsets.ModelViewSet)`
- `class XxxView(APIView)`

#### Go/Gin
- `r.GET()`, `r.POST()`, `r.PUT()`, `r.DELETE()`, `r.PATCH()`
- `group.GET()`, `group.POST()`
- `http.HandleFunc()`, `http.Handle()`
- `mux.HandleFunc()`, `mux.Handle()`

### Graceful Exit — No API Endpoints

If no API endpoints are detected, output a summary note and zero gap entries for the application phase.

## Phase 2: Security Gap Detection — Application Rules

### 1. Missing Authentication Middleware (AC3a)

Detect endpoints with no authentication middleware. Mutating endpoints (POST, PUT, PATCH, DELETE) missing auth are `critical`. Read endpoints (GET) missing auth that return non-public data are `high`.

### 2. IDOR Vulnerability Detection (AC3b)

Detect endpoints where path parameters reference resources without ownership validation. IDOR vulnerabilities are `critical` severity.

### 3. Rate Limiting Gap Detection (AC3c)

Detect endpoints without rate limiting at the application level. Missing rate limiting is `high` severity.

**Note:** Reverse proxy or API gateway rate limiting is not visible to static code analysis. Verify infrastructure-level rate limiting separately.

### 4. Sensitive Data Exposure Detection (AC3d)

Detect endpoints whose response objects contain fields that should be filtered:
- `password`, `password_hash`, `hashed_password`
- `token`, `access_token`, `refresh_token`, `api_key`, `secret`
- `ssn`, `social_security`, `national_id`
- `credit_card`, `card_number`, `cvv`, `expiry`
- Any field matching patterns: `*_secret`, `*_key`, `*_token`

Sensitive data exposure is `high` severity.

### 5. Missing Input Validation on Mutating Endpoints (AC3e)

Detect POST/PUT/PATCH/DELETE endpoints that accept a request body but have no input validation. Missing input validation is `high` severity.

## Phase 3: False-Positive Mitigation — Inherited Auth

Before flagging an endpoint as "missing authentication middleware," trace the middleware chain upward:

#### Java/Spring Security
- `HttpSecurity.authorizeRequests().anyRequest().authenticated()` — app-level
- `@PreAuthorize` on controller class — class-level
- `SecurityFilterChain` bean — app-level
- `.antMatchers("/api/**").authenticated()` — path-level

#### Node/Express Middleware
- `app.use(authMiddleware)` — app-level
- `router.use(passport.authenticate('jwt'))` — router-level
- `app.use('/api', authMiddleware, apiRouter)` — path-level

#### Django Permissions
- `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES: [IsAuthenticated]` — app-level
- `LoginRequiredMixin` — class-level
- `@login_required` — function-level

#### Go/Gin Middleware
- `r.Use(JWTAuth())` — app-level
- `group := r.Group("/api"); group.Use(AuthMiddleware())` — group-level

## Phase 4: Infrastructure Security Patterns (E12-S6)

**Apply ONLY when {project_type} is `infrastructure` or `platform`.**

### 4a. Exposed Ports in Kubernetes Manifests

Detect Kubernetes Services and Pods that expose ports unnecessarily or without documentation.

**Flag these:**
- `NodePort` services exposing ports to external traffic without documented justification
- `hostPort` usage in Pod specs (exposes container port on the node's IP)
- Services with `type: LoadBalancer` without IP whitelisting or security group restrictions
- Pods with `hostNetwork: true` (shares the node's network namespace)
- Containers listening on privileged ports (< 1024) without documented need

**Severity:** `high` for NodePort/LoadBalancer exposure, `critical` for hostNetwork/hostPort

### 4b. Permissive Ingress Rules

Detect overly permissive network ingress rules in Kubernetes Ingress resources, cloud security groups, and firewall rules.

**Flag these:**
- Kubernetes Ingress resources without TLS configuration
- Ingress rules with wildcard hosts: `host: "*"` or missing host field
- AWS Security Groups with `0.0.0.0/0` ingress on non-standard ports
- Terraform `aws_security_group_rule` with `cidr_blocks = ["0.0.0.0/0"]` on ports other than 80/443
- GCP firewall rules with `source_ranges = ["0.0.0.0/0"]` without service account filtering
- Azure NSG rules with `source_address_prefix = "*"` on sensitive ports

**Severity:** `critical` for `0.0.0.0/0` on sensitive ports (SSH/22, DB/3306/5432, admin ports), `high` for permissive ingress on standard ports

### 4c. Overly Broad RBAC Bindings

Detect Kubernetes RBAC configurations that grant excessive permissions.

**Flag these:**
- `ClusterRoleBinding` bound to `cluster-admin` for non-system service accounts
- `RoleBinding` or `ClusterRoleBinding` with `resources: ["*"]` and `verbs: ["*"]`
- Service accounts with `automountServiceAccountToken: true` when not needed
- `ClusterRole` with `apiGroups: ["*"]` granting access to all API groups
- Roles that grant `create`, `delete`, or `patch` on `secrets` without namespace scoping
- Default service account with non-default permissions

**Severity:** `critical` for cluster-admin bindings and wildcard permissions, `high` for broad secret access

### 4d. Missing NetworkPolicy

Detect Kubernetes namespaces and workloads without NetworkPolicy enforcement.

**Flag these:**
- Namespaces with no NetworkPolicy resources defined (all traffic allowed by default)
- Pods in namespaces where NetworkPolicy exists but does not select them (via label selectors)
- NetworkPolicy with empty `ingress` or `egress` rules (allows all traffic of that type)
- Workloads in production namespaces without both ingress AND egress NetworkPolicy
- Multi-tenant clusters without namespace-level network isolation

**Severity:** `high` for missing NetworkPolicy in production, `medium` for missing in non-production

## Output Format

### Gap Entry Structure

Each finding MUST use the standardized gap schema from `gap-entry-schema.md`:

```yaml
gap:
  id: "GAP-SECURITY-{seq}"
  category: "security-endpoint"
  severity: "{critical|high}"
  title: "Short description (max 80 chars)"
  description: "What was found, why it matters, what security implication it has"
  evidence:
    file: "relative/path/to/file"
    line: 42
  recommendation: "Actionable fix — add middleware, validate input, filter response"
  verified_by: "machine-detected"
  confidence: "{high|medium|low}"
```

### Confidence Classification

- **high** — exact pattern match (e.g., no auth decorator/annotation on a `@PostMapping` handler)
- **medium** — heuristic match (e.g., handler accesses path parameter without obvious ownership check)
- **low** — ambiguous case (e.g., custom auth mechanism not recognized by pattern table)

### Budget Enforcement

Each gap entry should average approximately 100 tokens in structured YAML format.
Maximum output: 70 gap entries per scan.

If more than 70 gaps are detected:
1. Sort all findings by severity (critical > high)
2. Within same severity, sort by confidence (high > medium > low)
3. Keep the top 70 entries
4. Append a budget summary section:

```markdown
## Budget Summary
Total gaps detected: {N}. Showing top 70 by severity. Omitted: {N-70} entries.
```

## Output File

Write all findings to: `{planning_artifacts}/brownfield-scan-security.md`
