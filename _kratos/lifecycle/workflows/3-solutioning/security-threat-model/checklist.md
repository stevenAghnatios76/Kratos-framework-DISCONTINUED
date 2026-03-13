---
title: 'Threat Model Validation'
validation-target: 'Threat model document'
required-inputs:
  - '{planning_artifacts}/architecture.md'
---
## Assets
- [ ] Assets cataloged with sensitivity levels
- [ ] Asset locations mapped to components
## STRIDE Analysis
- [ ] All six STRIDE categories evaluated per component
- [ ] Threats are specific and actionable, not generic
## DREAD Scoring
- [ ] Each threat scored on all 5 DREAD dimensions
- [ ] Risk levels assigned (Critical/High/Medium/Low)
## Mitigations
- [ ] High and critical threats have mitigations
- [ ] Mitigations are specific and implementable
## Security Requirements
- [ ] Requirements extracted with SR- identifiers
- [ ] Each requirement has acceptance criteria
## Output Verification
- [ ] Output file exists at {planning_artifacts}/threat-model.md
- [ ] Decisions recorded in security-sidecar
