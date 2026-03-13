---
title: 'Architecture Validation'
validation-target: 'Architecture document'
required-inputs:
  - '{planning_artifacts}/prd.md'
---
## Technology
- [ ] Stack selected with rationale
- [ ] Trade-offs documented
## System Design
- [ ] Component diagram described
- [ ] Service boundaries defined
- [ ] Communication patterns specified
## Data
- [ ] Data model defined
- [ ] Data flow documented
## API
- [ ] Endpoints overviewed
- [ ] Auth strategy defined
## Infrastructure
- [ ] Deployment topology described
- [ ] Environments defined
## ADRs
- [ ] Decisions recorded in architect-sidecar
- [ ] Each ADR has context, decision, consequences
## Gates
- [ ] PRD has "Review Findings Incorporated" section (hard gate — required before architecture)
## Adversarial Review
- [ ] Adversarial review completed on architecture document
- [ ] Architecture has "Review Findings Incorporated" section
## Output Verification
- [ ] Output file exists at {planning_artifacts}/architecture.md
