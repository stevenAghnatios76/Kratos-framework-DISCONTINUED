# Gap Entry Schema

> **Version:** 1.1.0
> **Story:** E11-S1, E12-S5
> **Traces to:** FR-111, FR-123, US-38, ADR-021, ADR-022
>
> Standardized output schema for brownfield scan subagents (E11).
> All scan agents MUST format gap entries using this schema.
> Infra-specific categories added for infrastructure/platform project support (E12-S5).
> Location: `_kratos/lifecycle/templates/gap-entry-schema.md`

## Schema Definition

Each gap entry is a YAML object with the following fields:

```yaml
id: "GAP-{scan_type}-{seq}"
category: "<enum>"
severity: "<enum>"
title: "<string>"
description: "<string>"
evidence:
  file: "<relative-path>"
  line: <number-or-range>
recommendation: "<string>"
verified_by: "<agent-id>"
confidence: "<enum>"
```

## Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier. Format: `GAP-{scan_type}-{seq}` where `scan_type` maps to the category and `seq` is a zero-padded 3-digit sequence (e.g., `GAP-dead-code-001`) |
| `category` | enum | yes | Gap classification — must be one of the 12 allowed values (see Category Enum) |
| `severity` | enum | yes | Impact level — must be one of the 5 allowed values (see Severity Enum) |
| `title` | string | yes | Short summary of the gap (max 80 characters) |
| `description` | string | yes | Detailed explanation of the gap, what it means, and why it matters |
| `evidence` | object | yes | Source code evidence (see Evidence Object) |
| `recommendation` | string | yes | Actionable fix or remediation guidance |
| `verified_by` | string | yes | ID of the scan agent that produced this finding (e.g., `dead-code-analyzer`, `config-scanner`) |
| `confidence` | enum | yes | Agent's confidence in the finding accuracy (see Confidence Enum) |

## Enums

### Severity Enum

| Value | Description |
|-------|-------------|
| `critical` | Blocks deployment or causes data loss |
| `high` | Significant risk requiring prompt attention |
| `medium` | Moderate risk, should be addressed in current sprint |
| `low` | Minor issue, can be deferred |
| `info` | Informational finding, no immediate action needed |

### Category Enum

12 categories total — 7 application categories (E11-S1) plus 5 infrastructure categories (E12-S5):

#### Application Categories (7)

| Value | Scan Agent | Description |
|-------|------------|-------------|
| `config-contradiction` | E11-S2 | Configuration files contradict each other or runtime behavior |
| `dead-code` | E11-S3 | Unreachable code, unused exports, orphaned files |
| `hard-coded-logic` | E11-S4 | Magic numbers, embedded URLs, environment-specific constants |
| `security-endpoint` | E11-S5 | Unprotected routes, missing auth, exposed secrets |
| `runtime-behavior` | E11-S6 | Behavior that only manifests at runtime (race conditions, memory leaks) |
| `doc-code-drift` | E11-S7 | Documentation does not match actual code behavior |
| `integration-seam` | E11-S8 | Fragile integration points, tight coupling, missing contracts |

#### Infrastructure Categories (5) — ADR-022 §10.16.5

| Value | Infra PRD Section | Description |
|-------|-------------------|-------------|
| `resource-drift` | Resource Specifications | Declared infrastructure state differs from actual deployed state (e.g., Terraform state mismatch, orphaned cloud resources) |
| `config-sprawl` | Environment Strategy & DX | Configuration values duplicated across multiple files without a single source of truth (e.g., same port in Dockerfile, Helm values, and Terraform variables) |
| `secret-exposure` | Security Posture | Secrets, credentials, or sensitive values present in source files, environment configs, or IaC definitions without proper secrets management |
| `missing-policy` | Verification Strategy | Infrastructure lacks policy-as-code enforcement (e.g., no OPA/Rego, no Checkov rules, no tfsec scans for security/compliance) |
| `environment-skew` | Environment Strategy & DX | Environment definitions (dev/staging/prod) have inconsistent resource specifications, missing parity, or undocumented differences |

### Confidence Enum

| Value | Description |
|-------|-------------|
| `high` | Strong evidence, verified through multiple signals |
| `medium` | Reasonable evidence, single signal source |
| `low` | Weak evidence, needs human verification |

## Evidence Object

The `evidence` field is a composite object grouping source location data:

```yaml
evidence:
  file: "src/services/auth.ts"    # Relative path from project root (non-empty string)
  line: 42                        # Single line number
```

Or with a line range:

```yaml
evidence:
  file: "config/database.yml"
  line: "15-28"                   # Line range (start-end)
```

| Sub-field | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `file` | string | yes | Relative path from project root. Must be non-empty. |
| `line` | number or string | yes | Single line number (integer) or range as `"start-end"` string |

## ID Format

Pattern: `GAP-{scan_type}-{seq}`

- `scan_type` is the category value (e.g., `dead-code`, `config-contradiction`)
- `seq` is a zero-padded 3-digit sequence number starting at 001
- Regex: `^GAP-(config-contradiction|dead-code|hard-coded-logic|security-endpoint|runtime-behavior|doc-code-drift|integration-seam|resource-drift|config-sprawl|secret-exposure|missing-policy|environment-skew)-\d{3}$`

The `scan_type` component in the ID maps directly to the `category` value. See the Category Enum tables (Application + Infrastructure) for the full list of valid scan types.

## Validation Rules

All fields listed in the Field Reference are **required** — a gap entry with any missing field is invalid.

### Enum Validation

- `severity` must be exactly one of: `critical`, `high`, `medium`, `low`, `info`
- `category` must be exactly one of: `config-contradiction`, `dead-code`, `hard-coded-logic`, `security-endpoint`, `runtime-behavior`, `doc-code-drift`, `integration-seam`, `resource-drift`, `config-sprawl`, `secret-exposure`, `missing-policy`, `environment-skew`
- `confidence` must be exactly one of: `high`, `medium`, `low`
- Any value not in the enum set must be rejected

### Format Validation

- `id` must match the regex `^GAP-(config-contradiction|dead-code|hard-coded-logic|security-endpoint|runtime-behavior|doc-code-drift|integration-seam|resource-drift|config-sprawl|secret-exposure|missing-policy|environment-skew)-\d{3}$`
- `evidence.file` must be a non-empty string containing a relative path (no leading `/`)
- `evidence.line` must be a positive integer or a range string matching `^\d+-\d+$`
- `title` should not exceed 80 characters
- `verified_by` must be a non-empty string identifying the scan agent

### Required vs Optional

All 9 fields (`id`, `category`, `severity`, `title`, `description`, `evidence`, `recommendation`, `verified_by`, `confidence`) are **required**. There are no optional fields in the base schema.

## Budget Control

Each gap entry should average approximately **100 tokens** in structured YAML format (per NFR-024).

Guidelines:
- Use structured YAML, not prose paragraphs
- Keep `title` under 80 characters
- Keep `description` to 1-2 sentences
- Keep `recommendation` to 1-2 sentences
- Avoid embedding full code snippets in descriptions — reference via `evidence` instead

With 12 categories across application and infrastructure scans, total token usage varies by project type. After consolidation and deduplication (E11-S10), the single `consolidated-gaps.md` must stay within the 40K framework context budget.

## Examples

### Application Category Example

```yaml
id: "GAP-config-contradiction-001"
category: "config-contradiction"
severity: "high"
title: "Database timeout mismatch between config files"
description: "production.yaml sets db.timeout to 30s while docker-compose.yml sets POSTGRES_TIMEOUT to 10s."
evidence:
  file: "config/production.yaml"
  line: 18
recommendation: "Align timeout values. Set both to 30s or extract to a shared environment variable."
verified_by: "config-scanner"
confidence: "high"
```

### Infrastructure Category Examples

```yaml
id: "GAP-resource-drift-001"
category: "resource-drift"
severity: "high"
title: "Terraform state shows orphaned S3 bucket"
description: "S3 bucket 'app-logs-legacy' exists in AWS but is not declared in any Terraform configuration."
evidence:
  file: "infra/terraform/storage.tf"
  line: "1-45"
recommendation: "Import the bucket into Terraform state or delete it if no longer needed."
verified_by: "infra-drift-scanner"
confidence: "high"
```

```yaml
id: "GAP-config-sprawl-001"
category: "config-sprawl"
severity: "medium"
title: "Database port duplicated across 4 config files"
description: "Port 5432 is hardcoded in Dockerfile, docker-compose.yml, Helm values.yaml, and Terraform variables.tf."
evidence:
  file: "docker-compose.yml"
  line: 14
recommendation: "Extract database port to a single environment variable, reference it from all 4 files."
verified_by: "config-sprawl-scanner"
confidence: "high"
```

```yaml
id: "GAP-secret-exposure-001"
category: "secret-exposure"
severity: "critical"
title: "AWS access key embedded in Terraform variables"
description: "AWS_ACCESS_KEY_ID is set as a default value in variables.tf instead of using a secrets manager."
evidence:
  file: "infra/terraform/variables.tf"
  line: 23
recommendation: "Remove the default value, use AWS SSM Parameter Store or HashiCorp Vault."
verified_by: "secret-scanner"
confidence: "high"
```

```yaml
id: "GAP-missing-policy-001"
category: "missing-policy"
severity: "medium"
title: "No policy-as-code enforcement for Kubernetes manifests"
description: "Kubernetes deployments lack OPA/Gatekeeper or Kyverno policies for security constraints."
evidence:
  file: "k8s/deployments/api-server.yaml"
  line: "1-30"
recommendation: "Add OPA Gatekeeper constraints or Kyverno policies to enforce pod security standards."
verified_by: "policy-scanner"
confidence: "medium"
```

```yaml
id: "GAP-environment-skew-001"
category: "environment-skew"
severity: "high"
title: "Staging uses 2 replicas while production uses 5"
description: "Replica counts differ between staging and production with no documented justification."
evidence:
  file: "k8s/overlays/staging/deployment-patch.yaml"
  line: 8
recommendation: "Document the replica difference rationale or align staging proportionally."
verified_by: "env-skew-scanner"
confidence: "high"
```
