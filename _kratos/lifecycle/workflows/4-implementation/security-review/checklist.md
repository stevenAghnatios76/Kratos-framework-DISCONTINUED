---
title: 'Security Review Validation'
validation-target: 'Security review report'
required-inputs:
  - '{implementation_artifacts}/{{story_key}}.md'
---
## OWASP Coverage
- [ ] All 10 OWASP categories checked
- [ ] Findings are specific with code locations
## Secrets
- [ ] No hardcoded secrets detected
- [ ] Secrets management approach verified
## Authentication
- [ ] Auth flow reviewed
- [ ] Authorization checks at access points
- [ ] Session management validated
## Findings
- [ ] Each finding has severity level
- [ ] Each finding has remediation suggestion
- [ ] Overall risk assessment provided
## Verdict
- [ ] PASSED or FAILED verdict clearly stated in report
## Review Gate
- [ ] Review Gate table updated in story file
- [ ] If PASSED: Security Review row shows PASSED with report link
- [ ] If FAILED: Security Review row shows FAILED, story status set to in-progress
- [ ] Review gate check protocol invoked
## Output Verification
- [ ] Report generated with findings table
