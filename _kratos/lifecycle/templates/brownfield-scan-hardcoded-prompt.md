# Hard-Coded Business Logic Scanner — Subagent Prompt

> Brownfield deep analysis scan subagent. Detects hard-coded business logic values that should be externalized to configuration.
> Reference: Architecture ADR-021, Section 10.15.2, Section 10.15.5, ADR-022 §10.16.5
> Infra-awareness: E12-S6 — applies infra-specific patterns when project_type is infrastructure or platform.

## Objective

Scan the codebase at `{project-path}` to identify hard-coded business logic values embedded in source code. These are values that represent business rules, configuration, or environment-specific settings and should be externalized to configuration files, environment variables, or feature flags.

**Input variables:**
- `{tech_stack}` — Detected technology stack from Step 1 discovery
- `{project-path}` — Absolute path to the project source code directory
- `{project_type}` — Project type: `application`, `infrastructure`, or `platform`

**Output format:** Follow the gap entry schema at `{project-root}/_kratos/lifecycle/templates/gap-entry-schema.md` exactly.

## Detection Categories — Application Patterns

Scan for the following 6 categories of hard-coded values:

### 1. Magic Numbers in Business Calculations

Values used in business logic that represent thresholds, limits, rates, or quantities.

**Flag these:**
- Numeric thresholds in business conditions: `if (amount > 10000)`
- Hard-coded retry counts in business logic: `maxRetries = 3`
- Hard-coded pagination limits: `const PAGE_SIZE = 50`
- Timeout values embedded in business logic: `setTimeout(callback, 30000)`

### 2. Hard-coded URLs and Endpoints

URLs, API endpoints, and service addresses embedded directly in source code.

**Flag these:**
- Production/staging URLs: `fetch("https://api.prod.example.com/v2")`
- Hard-coded service endpoints: `const API_BASE = "https://internal.service.com"`
- Database connection strings with hostnames: `mongodb://prod-db:27017`

### 3. Embedded SQL Queries with Business Rules

SQL queries containing hard-coded business logic values.

**Flag these:**
- Hard-coded role/status values in WHERE clauses
- Business tier filtering with literal strings
- Hard-coded date boundaries

### 4. Date/Time Thresholds

Hard-coded dates, times, or durations that represent business policy.

### 5. Pricing and Rate Values

Monetary values, percentages, rates, or financial thresholds embedded in code.

### 6. Role and Permission Strings

Hard-coded role names, permission identifiers, or authorization strings.

## Detection Categories — Infrastructure Patterns (E12-S6)

**Apply ONLY when {project_type} is `infrastructure` or `platform`.**

### 7. Hard-Coded IP Addresses in Infrastructure Files

Detect IP addresses embedded directly in IaC, Kubernetes manifests, and network configuration.

**Flag these:**
- IPv4 addresses in Terraform configs: `cidr_block = "10.0.1.0/24"` with specific IPs (not CIDR ranges for subnets)
- Hard-coded IPs in Kubernetes Services or Endpoints: `clusterIP: "10.96.0.10"`
- Static IPs in Helm values: `loadBalancerIP: "203.0.113.50"`
- Hard-coded DNS entries: `server = "10.0.0.53"` instead of using service discovery
- IPs in security group rules: `cidr_blocks = ["203.0.113.0/32"]`

**Do NOT flag:**
- Standard CIDR ranges for VPC/subnet definitions: `10.0.0.0/16`, `172.16.0.0/12`
- Loopback addresses: `127.0.0.1`, `0.0.0.0`
- Kubernetes internal DNS: `kube-dns`, `coredns`

**Gap category:** `hard-coded-logic` with infra context in description

### 8. Magic Port Numbers in Infrastructure

Detect non-standard or undocumented port numbers in infrastructure configuration.

**Flag these:**
- Non-standard port numbers without documentation: `containerPort: 8443`, `hostPort: 9999`
- Port numbers that differ between service and deployment: `port: 80` in Service but `containerPort: 8080` in Pod
- Hard-coded port ranges in security groups: `from_port = 30000, to_port = 32767`
- Port numbers in environment variables with literal values: `PORT=3001`

**Do NOT flag:**
- Well-known ports with standard usage: 80 (HTTP), 443 (HTTPS), 22 (SSH), 5432 (PostgreSQL), 3306 (MySQL), 6379 (Redis), 27017 (MongoDB)
- Ports defined in variables/config and referenced: `var.app_port`

**Gap category:** `hard-coded-logic` with infra context in description

### 9. Embedded Secrets and Credential Patterns

Detect secrets, credentials, AMI IDs, and sensitive values embedded in IaC or config files.

**Flag these (critical severity):**
- AWS access keys: patterns matching `AKIA[0-9A-Z]{16}` in any file
- AWS secret keys: base64-like strings assigned to `secret_key` or `aws_secret_access_key`
- API tokens in config: `token = "ghp_..."`, `api_key = "sk-..."`
- Database passwords in plaintext: `password = "mysecretpassword"` in tfvars or values.yaml
- SSH private keys embedded in configs or user-data scripts

**Flag these (high severity):**
- AMI IDs hard-coded: `ami = "ami-0abcdef1234567890"` — should use data source or variable
- Docker image tags with specific SHA: `image: myapp@sha256:abc123` when not pinned intentionally
- Hard-coded AWS account IDs: `account_id = "123456789012"`
- Hard-coded region strings: `region = "us-east-1"` without variable reference

**Gap category:** `hard-coded-logic` (or escalate to `secret-exposure` for actual credentials)

### 10. Hard-Coded Resource Limits in Infrastructure

Detect hard-coded CPU and memory limits in Kubernetes manifests, Terraform configs, and Docker files.

**Flag these:**
- Kubernetes resource requests/limits with literal values:
  ```yaml
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "1000m"
      memory: "1Gi"
  ```
  These should reference Helm values or kustomize patches for environment-specific tuning.
- Terraform instance types hard-coded: `instance_type = "t3.medium"` — should be a variable
- Docker memory limits: `--memory="2g"` in compose files without variable reference
- Auto-scaling thresholds: `min_size = 2, max_size = 10` without variables
- EBS volume sizes: `size = 100` without variable reference

**Do NOT flag:**
- Resource values defined in Helm values.yaml (already externalized)
- Resource values in Terraform variables (already parameterized)
- Default values in variable blocks with clear documentation

**Gap category:** `hard-coded-logic` with infra context in description

## Acceptable Constant Allowlist

Do NOT flag: HTTP status codes, math constants, array indices, standard library constants, test fixture data.

## Stack-Aware Detection Patterns

Apply framework-specific patterns based on {tech_stack} (Java/Spring, Node/Express, Python/Django, Go/Gin) as documented in the original E11-S4 specification.

## False Positive Suppression Rules

- Configuration files (.yml, .yaml, .properties, .env) are externalized — do not flag
- Test files contain legitimate test fixtures — skip
- Framework-specific externalization patterns (Spring @Value, process.env, Django settings) — do not flag

## Output Format

Gap entry structure uses `category: "hard-coded-logic"` with `id: "GAP-HARDCODED-{seq}"`.
For infra-specific findings, include "[INFRA]" prefix in the title for clarity.
Budget: max 70 entries, truncate low-severity if exceeded.

## Output File

Write all findings to: `{planning_artifacts}/brownfield-scan-hardcoded.md`
