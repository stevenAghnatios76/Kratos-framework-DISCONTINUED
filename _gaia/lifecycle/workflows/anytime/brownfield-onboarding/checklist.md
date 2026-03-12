---
title: 'Brownfield Onboarding Validation'
validation-target: 'Brownfield onboarding output'
---
## Step 1: Discovery
- [ ] Existing project documented
- [ ] Tech stack identified
- [ ] Current architecture mapped
- [ ] Capability flags detected (has_apis, has_events, has_external_deps, has_frontend)
- [ ] Testing infrastructure assessed
- [ ] CI/CD pipeline documented
- [ ] Brownfield assessment generated at {planning_artifacts}/brownfield-assessment.md
## Step 2: Parallel Documentation Subagents
- [ ] Dependency map subagent completed — {planning_artifacts}/dependency-map.md exists
- [ ] Dependency audit subagent completed — {test_artifacts}/dependency-audit-{date}.md exists
- [ ] API documentation subagent completed (if has_apis) — {planning_artifacts}/api-documentation.md exists
- [ ] UX design assessment subagent completed (if has_frontend) — {planning_artifacts}/ux-design.md exists
- [ ] Event catalog subagent completed (if has_events) — {planning_artifacts}/event-catalog.md exists
- [ ] All API docs use Swagger/OpenAPI format
- [ ] All diagrams use Mermaid syntax
## Step 3: NFR Assessment & Performance Test Plan
- [ ] NFR assessment subagent completed — {test_artifacts}/nfr-assessment.md exists
- [ ] NFR baseline summary table has real measured values (not placeholders)
- [ ] Performance test plan created — {test_artifacts}/performance-test-plan-{date}.md exists
- [ ] Performance budgets defined (P50/P95/P99) based on NFR baselines
- [ ] Load test scenarios designed (gradual, spike, soak)
- [ ] Frontend performance targets set if applicable (LCP, INP, CLS)
- [ ] CI performance gates configured with pass/fail thresholds
## Step 4: Gap Analysis PRD
- [ ] If prior prd.md existed, user confirmed overwrite or alternate filename used
- [ ] PRD created with gap-focused content only
- [ ] NFR section includes current baseline and target from nfr-assessment.md
- [ ] Upstream artifacts referenced (api-docs, event-catalog, dependency-map, ux-design)
- [ ] Priority matrix maps each gap to priority/effort/impact
## Step 5: Adversarial Review
- [ ] Adversarial review subagent completed — {planning_artifacts}/adversarial-review-{date}.md exists
- [ ] Critical/high findings incorporated into PRD
- [ ] "Review Findings Incorporated" section added to PRD
## Step 6: Architecture & Phase 3 Handoff
- [ ] Architecture subagent completed — {planning_artifacts}/architecture.md exists
- [ ] User informed of remaining Phase 3 sequence: /gaia-test-design → /gaia-create-epics → /gaia-readiness-check
## Output Verification
- [ ] Project documentation exists at {planning_artifacts}/project-documentation.md
- [ ] API documentation exists at {planning_artifacts}/api-documentation.md (if has_apis)
- [ ] UX design exists at {planning_artifacts}/ux-design.md (if has_frontend)
- [ ] Event catalog exists at {planning_artifacts}/event-catalog.md (if has_events)
- [ ] Dependency map exists at {planning_artifacts}/dependency-map.md
- [ ] NFR assessment exists at {test_artifacts}/nfr-assessment.md
- [ ] Performance test plan exists at {test_artifacts}/performance-test-plan-*.md
- [ ] PRD exists at {planning_artifacts}/prd.md
- [ ] Architecture exists at {planning_artifacts}/architecture.md
- [ ] Next step: /gaia-test-design → /gaia-create-epics → /gaia-readiness-check
