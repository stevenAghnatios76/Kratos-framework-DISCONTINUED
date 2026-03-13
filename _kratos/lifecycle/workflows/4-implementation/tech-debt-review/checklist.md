---
title: 'Tech Debt Review Validation'
validation-target: 'Tech debt dashboard'
---
## Scan
- [ ] All story files scanned for tech-debt findings
- [ ] Sprint-status.yaml parsed for backlog debt stories
- [ ] Previous dashboard loaded for trend comparison (if exists)
## Classification
- [ ] Every debt item assigned exactly one category (design/code/test/infrastructure)
- [ ] Every debt item tagged with source (finding/triage/manual)
## Scoring
- [ ] Impact, effort, and risk-of-inaction scores assigned (1-5 each)
- [ ] Debt Score computed: (Impact + Risk) - Effort
- [ ] Priority mapped: FIX NOW (>=7) / PLAN NEXT (4-6) / TRACK (1-3)
- [ ] Top 5 scores confirmed with user
## Aging
- [ ] Age calculated in sprints for every item
- [ ] SLA thresholds applied (OVERDUE / escalated / review relevance)
## Dashboard
- [ ] Summary metrics table complete
- [ ] Category breakdown table complete
- [ ] Top 10 debt items listed with scores and actions
- [ ] Overdue alerts shown for SLA-breaching items
- [ ] Trend data included (or "First review" noted)
## Recommendations
- [ ] Actionable next steps provided with specific /kratos-* commands
- [ ] Debt ratio assessed with sprint allocation recommendation
## Output Verification
- [ ] Dashboard file exists at {implementation_artifacts}/tech-debt-dashboard.md
