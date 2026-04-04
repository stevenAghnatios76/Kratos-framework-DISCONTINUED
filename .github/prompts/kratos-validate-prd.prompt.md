---
name: kratos-validate-prd
description: Run the KRATOS validate-prd workflow to validate a PRD against standards.
argument-hint: Optionally specify the PRD file path to validate.
agent: kratos-orchestrator
---

Execute the KRATOS validate-prd workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [validate-prd/workflow.yaml](../../_kratos/lifecycle/workflows/2-planning/validate-prd/workflow.yaml) and its referenced instructions.
- Read the PRD document under [../../docs/planning-artifacts](../../docs/planning-artifacts).
- Respect checkpoints and quality gates defined by KRATOS.
- Validate the PRD against the checklist and produce a validation report.
