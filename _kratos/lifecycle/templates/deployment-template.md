---
template: 'deployment'
version: 1.0.0
used_by: ['deployment-checklist']
---

# Deployment Plan: {release_name}

> **Project:** {project_name}
> **Date:** {date}
> **Author:** {agent_name}
> **Target Environment:** {environment}

## Release Summary

{What is being deployed and key changes included.}

## Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Rollback plan documented

## Deployment Steps

1. {Step 1 — e.g., enable maintenance mode}
2. {Step 2 — e.g., run database migrations}
3. {Step 3 — e.g., deploy application}
4. {Step 4 — e.g., run smoke tests}
5. {Step 5 — e.g., disable maintenance mode}

## Post-Deployment Verification

| Check | Expected | Actual |
|-------|----------|--------|
| Health endpoint | 200 OK | {result} |
| Key metric | {baseline} | {result} |

## Rollback Plan

**Trigger criteria:** {When to roll back}

1. {Rollback step 1}
2. {Rollback step 2}

## Communication

| Audience | When | Channel | Message |
|----------|------|---------|---------|
| {team} | {timing} | {channel} | {message} |
