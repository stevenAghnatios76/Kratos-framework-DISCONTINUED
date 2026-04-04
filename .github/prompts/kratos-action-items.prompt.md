---
name: kratos-action-items
description: Run the KRATOS action-items workflow to process and resolve action items.
argument-hint: Use "status" for dashboard, or provide an action ID (A-001).
agent: kratos-orchestrator
---

Execute the KRATOS action-items workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [action-items/workflow.yaml](../../_kratos/lifecycle/workflows/4-implementation/action-items/workflow.yaml) and its referenced instructions.
- Read action items from [../../docs/implementation-artifacts/action-items.yaml](../../docs/implementation-artifacts/action-items.yaml).
- Respect story status, checkpoints, and quality gates defined by KRATOS.
- Process and resolve action items from retro, triage, tech-debt, and correct-course workflows.
