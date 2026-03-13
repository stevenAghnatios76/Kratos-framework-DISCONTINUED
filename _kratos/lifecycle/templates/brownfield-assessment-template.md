---
template: 'brownfield-assessment'
version: 1.0.0
used_by: ['brownfield-onboarding']
---

# Brownfield Assessment: {product_name}

> **Project:** {project_name}
> **Date:** {date}
> **Author:** {agent_name}
> **Mode:** Brownfield — system assessment and migration planning

## 1. As-Is System Architecture

{High-level description of the current system architecture, including key components, data flows, and integration points.}

### Component Inventory

| Component | Technology | Status | Maintainability |
|-----------|-----------|--------|-----------------|
| {component} | {tech stack} | {Active / Legacy / Deprecated} | {High / Medium / Low} |

### Architecture Diagram

{Mermaid C4 Level 1 context diagram of current system}

## 2. Technical Debt Inventory

| Debt Item | Category | Severity | Effort to Resolve | Business Impact |
|-----------|----------|----------|--------------------|-----------------|
| {description} | {Code / Architecture / Infrastructure / Testing / Documentation} | {Critical / High / Medium / Low} | {S / M / L / XL} | {What breaks or degrades if not addressed} |

### Debt Severity Summary

| Severity | Count | Recommended Action |
|----------|-------|--------------------|
| Critical | {n} | Must resolve before new feature work |
| High | {n} | Resolve within current quarter |
| Medium | {n} | Schedule for debt sprint |
| Low | {n} | Address opportunistically |

## 3. Migration Constraints & Risks

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| {Data migration: schema differences, volume, downtime window} | {What goes wrong if violated} | {Strategy to handle} |
| {API compatibility: consumers that depend on current contracts} | {Breaking change impact} | {Versioning / adapter strategy} |
| {Infrastructure: environments, deployment pipeline, secrets} | {What needs to change} | {Phased approach} |
| {Regulatory: compliance, audit trail, data residency} | {Non-negotiable constraints} | {How to maintain compliance} |

## 4. Coexistence Strategy

{How will new code and legacy code run together during the transition period?}

| Aspect | Strategy | Duration |
|--------|----------|----------|
| Routing | {Feature flags / API gateway / URL-based / header-based} | {Until full migration} |
| Data | {Dual-write / sync / migration batches / shared DB} | {Until cutover} |
| Auth | {Shared session / token federation / unified IdP} | {Permanent or transitional} |
| Monitoring | {Unified dashboards / separate but linked} | {Until consolidation} |

## 5. Incremental Adoption Path

| Phase | Scope | Success Criteria | Rollback Plan |
|-------|-------|-----------------|---------------|
| 1 | {First migration slice — lowest risk} | {Metrics that confirm success} | {How to revert} |
| 2 | {Second slice — medium complexity} | {Metrics} | {Revert strategy} |
| 3 | {Final migration — legacy decommission} | {Metrics} | {Point of no return considerations} |

## 6. Assessment Summary

| Area | Current State | Risk Level | Key Action |
|------|--------------|------------|------------|
| Architecture | {summary} | {High / Medium / Low} | {primary recommendation} |
| Technical Debt | {X critical, Y high items} | {High / Medium / Low} | {debt resolution timeline} |
| Migration Risk | {summary} | {High / Medium / Low} | {mitigation priority} |
| Coexistence | {strategy chosen} | {High / Medium / Low} | {implementation approach} |
