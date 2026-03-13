---
template: 'review'
version: 1.0.0
used_by: ['code-review']
---

# Code Review: {review_subject}

> **Project:** {project_name}
> **Date:** {date}
> **Reviewer:** {agent_name}

## Summary

{Brief summary of what was reviewed and overall assessment.}

## Files Reviewed

| File | Lines | Changes |
|------|-------|---------|
| {path} | {count} | {description} |

## Findings

### Critical

{Issues that must be fixed before merge.}

### Warnings

{Issues that should be addressed but are not blocking.}

### Suggestions

{Optional improvements for consideration.}

## Checklist

- [ ] Correctness: Logic is sound
- [ ] Security: No OWASP top 10 vulnerabilities
- [ ] Performance: No obvious bottlenecks
- [ ] Readability: Code is clear and well-named
- [ ] Tests: Adequate coverage for changes

## Verdict

{APPROVE | REQUEST_CHANGES | COMMENT}
