---
template: 'platform-prd'
version: 1.0.0
used_by: ['create-prd']
domain: '{domain}'
---

# Platform PRD: {product_name}

> **Project:** {project_name}
> **Domain:** {domain}
> **Date:** {date}
> **Author:** {agent_name}
> **Status:** Draft | In Review | Approved
> **Project Type:** Platform (application + infrastructure)

> Requirement IDs use prefixes to disambiguate scope: FR-### and NFR-### for application requirements, IR-###, OR-###, and SR-### for infrastructure requirements. IDs are globally unique within a project — each prefix defines a separate namespace.

---

# Part I: Application Requirements

## 1. Overview

{Brief product overview and context. What is being built and why.}

## 2. Goals and Non-Goals

### Goals
- {Goal 1}
- {Goal 2}

### Non-Goals
- {Explicitly out of scope item 1}

## 3. User Stories

| ID | As a... | I want to... | So that... | Priority |
|----|---------|-------------|-----------|----------|
| US-01 | {role} | {action} | {benefit} | {P0-P3} |

## 4. Functional Requirements

### 4.1 {Feature Area}

- **FR-01:** {Requirement description}
- **FR-02:** {Requirement description}

## 5. Non-Functional Requirements

| ID | Category | Requirement | Target |
|----|----------|------------|--------|
| NFR-001 | Performance | {requirement} | {target} |
| NFR-002 | Security | {requirement} | {target} |
| NFR-003 | Accessibility | {requirement} | {target} |

## 6. Out of Scope

| Exclusion | Reason |
|-----------|--------|
| {feature or integration} | {deferred / not needed / separate product} |

## 7. UX Requirements

{Key interaction patterns, wireframe references, accessibility needs.}

## 8. Technical Constraints

- {Platform, language, or integration constraint}

## 9. Dependencies

| Dependency | Type | Failure Mode | Fallback Behavior | SLA Expectation |
|------------|------|-------------|-------------------|-----------------|
| {service or system} | {API / Database / Message Queue / CDN / Auth Provider} | {What happens when it's unavailable} | {Graceful degradation / Retry / Queue / Circuit breaker / Hard fail} | {Expected uptime / latency / throughput} |

## 10. Milestones

| Milestone | Target Date | Deliverables |
|-----------|------------|-------------|
| {milestone} | {date} | {deliverables} |

---

# Part II: Infrastructure Requirements

## 11. Platform Overview & Scope

{Platform purpose, target environments, and team ownership.}

### Platform Purpose

{What this infrastructure provides and why it exists.}

### Target Environments

| Environment | Purpose | Region(s) | Owner |
|-------------|---------|-----------|-------|
| {env_name} | {purpose} | {regions} | {team} |

### Team Ownership

| Component | Owning Team | Escalation |
|-----------|-------------|------------|
| {component} | {team} | {contact} |

## 12. Platform Capabilities

{What the infrastructure enables. Each capability follows the format below.}

| ID | Capability | SLO |
|----|-----------|-----|
| PC-01 | Enable {team/service} to {capability} with {SLO} | {target} |
| PC-02 | Enable {team/service} to {capability} with {SLO} | {target} |

## 13. Resource Specifications

{Compute, storage, networking, IAM provisioning. Per-environment breakdown.}

### Compute

| Resource | Environment | Spec | Scaling |
|----------|-------------|------|---------|
| {resource} | {env} | {cpu/memory} | {auto/manual, min-max} |

### Storage

| Store | Type | Size | IOPS | Backup |
|-------|------|------|------|--------|
| {store} | {block/object/file} | {size} | {iops} | {policy} |

### Networking

| Component | CIDR/Range | Protocol | Purpose |
|-----------|-----------|----------|---------|
| {component} | {cidr} | {protocol} | {purpose} |

### IAM Provisioning

| Role/Policy | Scope | Permissions | Lifecycle |
|-------------|-------|-------------|-----------|
| {role} | {scope} | {permissions} | {create/rotate/revoke} |

### State Management

{State backend strategy — e.g., Terraform remote state, locking, encryption.}

| Backend | Lock Provider | Encryption | Workspace Strategy |
|---------|--------------|------------|-------------------|
| {backend} | {lock} | {encryption} | {workspace} |

### Data Persistence Requirements

| Data Store | Durability | Replication | Retention |
|------------|-----------|-------------|-----------|
| {store} | {durability} | {replication} | {retention} |

## 14. Operational SLOs

{Availability targets, MTTR, RTO/RPO, error budgets, resource utilization targets.}

### Availability & Recovery

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | {99.x%} | {how measured} |
| MTTR | {minutes} | {how measured} |
| RTO | {minutes} | {recovery time objective} |
| RPO | {minutes} | {recovery point objective} |
| Error Budget | {x% per month} | {how calculated} |

### Resource Utilization Targets

| Resource | Target Utilization | Alert Threshold |
|----------|-------------------|-----------------|
| CPU | {target%} | {alert%} |
| Memory | {target%} | {alert%} |
| Storage IOPS | {target} | {threshold} |
| Network Bandwidth | {target Gbps} | {threshold} |
| Network Latency | {target ms} | {threshold} |

## 15. Security Posture

{Security requirements tailored for infrastructure projects.}

### IAM/RBAC

{Identity and access management, role-based access control policies.}

| Principal | Role | Scope | MFA Required | Review Cadence |
|-----------|------|-------|-------------|----------------|
| {principal} | {role} | {scope} | {yes/no} | {quarterly/annually} |

### Network Segmentation

{Network isolation, security groups, firewall rules, zero-trust boundaries.}

| Zone | CIDR | Ingress Rules | Egress Rules | Purpose |
|------|------|---------------|-------------|---------|
| {zone} | {cidr} | {rules} | {rules} | {purpose} |

### Secrets Management

{Secrets storage, rotation, injection, and audit strategy.}

| Secret Type | Store | Rotation | Injection Method |
|-------------|-------|----------|-----------------|
| {type} | {vault/kms/ssm} | {cadence} | {env var/sidecar/init container} |

### Image Provenance

{Container image signing, scanning, and supply chain verification.}

| Registry | Signing | Scanning | Admission Policy |
|----------|---------|----------|-----------------|
| {registry} | {cosign/notary} | {trivy/grype} | {policy} |

### Compliance Mapping

{Regulatory and compliance framework alignment.}

| Framework | Controls | Evidence | Audit Frequency |
|-----------|----------|----------|----------------|
| {SOC2/HIPAA/PCI/ISO} | {control IDs} | {how demonstrated} | {cadence} |

## 16. Environment Strategy & Developer Experience

{Environment parity, promotion pipeline, drift detection, self-service provisioning.}

### Environment Parity

| Dimension | Dev | Staging | Production |
|-----------|-----|---------|-----------|
| {dimension} | {dev config} | {staging config} | {prod config} |

### Promotion Pipeline

{How changes flow from dev to production.}

```
{dev} → {staging} → {production}
```

### Drift Detection

{How configuration drift is detected and remediated.}

| Tool | Schedule | Remediation | Notification |
|------|----------|-------------|-------------|
| {tool} | {cron} | {auto/manual} | {channel} |

### Self-Service Provisioning

{Developer self-service capabilities and guardrails.}

| Capability | Interface | Guardrails | Approval |
|------------|-----------|-----------|----------|
| {capability} | {CLI/portal/API} | {policy} | {auto/manual} |

### Onboarding

{New team member and new service onboarding procedures.}

### Observability

{Monitoring, logging, tracing, and alerting strategy.}

| Signal | Tool | Retention | Alerting |
|--------|------|-----------|---------|
| Metrics | {prometheus/cloudwatch} | {retention} | {pagerduty/slack} |
| Logs | {elk/cloudwatch} | {retention} | {rules} |
| Traces | {jaeger/xray} | {retention} | {rules} |

## 17. Dependencies & Provider Constraints

{Cloud provider limits, Terraform provider versions, upstream service contracts.}

### Cloud Provider Limits

| Provider | Service | Limit | Current Usage | Headroom |
|----------|---------|-------|--------------|----------|
| {provider} | {service} | {limit} | {current} | {remaining} |

### Terraform Provider Versions

| Provider | Version | Constraint | Notes |
|----------|---------|-----------|-------|
| {provider} | {version} | {~> x.y} | {notes} |

### Upstream Service Contracts

| Service | SLA | API Version | Deprecation |
|---------|-----|------------|-------------|
| {service} | {sla} | {version} | {date or N/A} |

## 18. Cost Model

{Per-environment resource cost estimates, scaling cost projections, and cost-per-unit efficiency metrics.}

### Per-Environment Resource Cost Estimates

| Resource | Dev (monthly) | Staging (monthly) | Production (monthly) |
|----------|--------------|-------------------|---------------------|
| Compute | ${cost} | ${cost} | ${cost} |
| Storage | ${cost} | ${cost} | ${cost} |
| Networking | ${cost} | ${cost} | ${cost} |
| Monitoring | ${cost} | ${cost} | ${cost} |
| **Total** | **${total}** | **${total}** | **${total}** |

### Scaling Cost Projections

| Scenario | Trigger | Additional Cost | Timeline |
|----------|---------|----------------|----------|
| {scenario} | {trigger condition} | ${projection} | {timeframe} |

### Cost-Per-Unit Efficiency Metrics

| Metric | Current | Target | Optimization |
|--------|---------|--------|-------------|
| Cost per request | ${cost} | ${target} | {strategy} |
| Cost per GB stored | ${cost} | ${target} | {strategy} |
| Cost per environment | ${cost} | ${target} | {strategy} |

## 19. Verification Strategy

{Policy-as-code (OPA/Rego, Checkov, tfsec), plan validation, smoke tests, drift detection, chaos testing.}

### Policy-as-Code

| Tool | Scope | Rules | Enforcement |
|------|-------|-------|-------------|
| OPA/Rego | {scope} | {rule count} | {warn/deny} |
| Checkov | {scope} | {rule count} | {warn/deny} |
| tfsec | {scope} | {rule count} | {warn/deny} |

### Plan Validation

{Terraform plan review, cost estimation, blast radius analysis.}

| Check | Tool | Gate | Threshold |
|-------|------|------|-----------|
| {check} | {tool} | {CI/manual} | {threshold} |

### Smoke Tests

{Post-deployment verification tests.}

| Test | Target | Expected | Timeout |
|------|--------|----------|---------|
| {test} | {endpoint/resource} | {result} | {timeout} |

### Drift Detection

{Scheduled plan diffs, state file monitoring, compliance scanning.}

### Chaos Testing

{Failure injection, resilience validation.}

| Experiment | Target | Hypothesis | Blast Radius |
|-----------|--------|-----------|-------------|
| {experiment} | {target} | {hypothesis} | {scope} |

## 20. Operational Runbooks

{Scaling, failover, incident response, rollback procedures.}

### Scaling Procedures

| Trigger | Action | Rollback | Owner |
|---------|--------|----------|-------|
| {trigger} | {action} | {rollback} | {team} |

### Failover Procedures

| Scenario | Detection | Response | RTO |
|----------|-----------|----------|-----|
| {scenario} | {detection} | {response steps} | {rto} |

### Incident Response

| Severity | Notification | Escalation | Runbook |
|----------|-------------|------------|---------|
| P1 | {channel} | {escalation path} | {link} |
| P2 | {channel} | {escalation path} | {link} |

### Rollback Procedures

| Change Type | Rollback Method | Verification | Duration |
|-------------|----------------|-------------|----------|
| {type} | {method} | {verification} | {estimate} |

---

# Part III: Combined Requirements Summary

## 21. Requirements Summary

> IDs are globally unique within a project. The prefix disambiguates the requirement scope: FR/NFR for application, IR/OR/SR for infrastructure.

### Application Requirements

| ID | Description | Priority | Status |
|----|------------|----------|--------|
| FR-001 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |
| NFR-001 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |

### Infrastructure Requirements

| ID | Description | Priority | Status |
|----|------------|----------|--------|
| IR-001 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |
| IR-002 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |

### Operational Requirements

| ID | Description | Priority | Status |
|----|------------|----------|--------|
| OR-001 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |
| OR-002 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |

### Security Requirements

| ID | Description | Priority | Status |
|----|------------|----------|--------|
| SR-001 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |
| SR-002 | {description} | {Must-Have/Should-Have/Nice-to-Have} | {Draft/Approved} |

## 22. Open Questions

- [ ] {Unresolved question}
