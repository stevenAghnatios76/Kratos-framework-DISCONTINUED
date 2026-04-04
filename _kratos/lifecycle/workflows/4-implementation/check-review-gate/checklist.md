---
title: 'Review Gate Check'
validation-target: 'Composite review gate evaluation and status transition'
---

## Checks

- [ ] Story file found and loaded
- [ ] Story status is review or done
- [ ] Review Gate table has exactly 6 rows
- [ ] All 6 review statuses parsed (PASSED/FAILED/PENDING)
- [ ] Shared protocol review-gate-check.xml loaded and executed
- [ ] Infra gate type detected if traces_to contains IR-/OR-/SR- prefixes
- [ ] DoD validation performed before transition
- [ ] Status transition applied correctly via status-sync protocol (or blocked with reason)
- [ ] Gate Status Report appended to story file
- [ ] Overall verdict determined
- [ ] Next step suggestion provided
