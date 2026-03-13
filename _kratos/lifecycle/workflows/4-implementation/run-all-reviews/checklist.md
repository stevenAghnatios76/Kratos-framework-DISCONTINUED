---
title: 'Run All Reviews Validation'
validation-target: 'Review orchestration'
---
## Pre-conditions
- [ ] Story identified and in 'review' status
- [ ] Review Gate table initialized with 6 rows
## Execution
- [ ] Each pending review dispatched to subagent
- [ ] Already-passed reviews skipped
- [ ] Story file re-read after each review completes
## Completion
- [ ] Review summary generated with all 6 verdicts
- [ ] Story status reflects gate outcome (done or still review)
