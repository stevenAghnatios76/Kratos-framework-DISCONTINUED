---
title: 'Architecture Edit Validation'
validation-target: 'Edited Architecture'
---
## Edit Quality
- [ ] Requested changes applied correctly
- [ ] Unchanged sections preserved exactly
- [ ] Architecture version incremented
- [ ] Consistency maintained across sections
## ADR Quality
- [ ] New ADR(s) created with auto-incremented ID
- [ ] Superseded ADRs marked with status update
- [ ] Addresses field maps to FR/NFR IDs
## Version History
- [ ] Version note added with date, reason, driver, and CR ID (if applicable)
## Review Gate
- [ ] Adversarial review completed OR explicitly skipped for minor edits
- [ ] "Review Findings Incorporated" section updated (if review ran)
## Cascade Assessment
- [ ] Impact classified for: epics/stories, test plan, infrastructure, traceability
- [ ] Next steps communicated to user
## Output Verification
- [ ] Output file saved to {planning_artifacts}/architecture.md
- [ ] Changes recorded in architect-sidecar memory
