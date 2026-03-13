---
title: 'Deployment Checklist Validation'
validation-target: 'Deployment checklist'
required-inputs:
  - '{test_artifacts}/traceability-matrix.md'
  - '{test_artifacts}/ci-setup.md'
  - '{planning_artifacts}/readiness-report.md'
---
## Pre-Deployment
- [ ] DB migrations verified
- [ ] Feature flags configured
- [ ] Config changes applied
## Dependencies
- [ ] External services verified
- [ ] API compatibility confirmed
## Test Infrastructure (HALT if missing)
- [ ] traceability-matrix.md exists at {test_artifacts}/traceability-matrix.md
- [ ] ci-setup.md exists at {test_artifacts}/ci-setup.md with enforced quality gates
- [ ] readiness-report.md status is PASS
## Rollback
- [ ] Rollback plan exists
- [ ] Rollback tested in staging
## Approvals (HALT if not CONFIRMED)
- [ ] QA sign-off: CONFIRMED (all tests passing, no critical bugs)
- [ ] Security sign-off: CONFIRMED (review complete, no critical findings)
- [ ] Stakeholder approval: CONFIRMED
- [ ] Go/no-go recommendation provided
## Output Verification
- [ ] Checklist file generated
