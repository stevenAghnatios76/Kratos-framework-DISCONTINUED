---
title: 'Code Review Validation'
validation-target: 'Code review report'
---
## Review
- [ ] All changed files reviewed
- [ ] Security issues checked
- [ ] Performance concerns noted
- [ ] Test coverage verified
## Decision
- [ ] APPROVE or REQUEST_CHANGES clearly stated
## Review Gate
- [ ] Review Gate table updated in story file
- [ ] If APPROVE: Code Review row shows PASSED with report link
- [ ] If REQUEST_CHANGES: Code Review row shows FAILED, story status set to in-progress
- [ ] Review gate check protocol invoked
## Output Verification
- [ ] Review report exists at {implementation_artifacts}/{story_key}-review.md
