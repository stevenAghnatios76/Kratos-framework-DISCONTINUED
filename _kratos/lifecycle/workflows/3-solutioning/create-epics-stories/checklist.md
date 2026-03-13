---
title: 'Epics and Stories Validation'
validation-target: 'Epics and stories document'
required-inputs:
  - '{planning_artifacts}/prd.md'
  - '{planning_artifacts}/architecture.md'
  - '{test_artifacts}/test-plan.md'
---
## Gates
- [ ] Architecture has "Review Findings Incorporated" section (hard gate — required before epics)
## Epics
- [ ] Epics group related features logically
- [ ] Each epic has description and goal
## Stories
- [ ] Each story has acceptance criteria
- [ ] Each story has size estimate
- [ ] Each story follows user story format
## Dependencies
- [ ] depends_on declared for each story
- [ ] blocks declared for each story
- [ ] No circular dependencies
## Test Integration
- [ ] test-plan.md read and risk levels extracted
- [ ] Each story has risk_level field (high/medium/low)
- [ ] High-risk stories include ATDD reminder in Dev Notes
## Priority
- [ ] Stories ordered by dependency + priority
- [ ] Priority labels assigned (P0/P1/P2)
## Output Verification
- [ ] Output file exists at {planning_artifacts}/epics-and-stories.md
