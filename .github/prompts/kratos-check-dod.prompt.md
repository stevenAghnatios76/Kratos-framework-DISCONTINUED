---
name: kratos-check-dod
description: Run the KRATOS check-dod workflow to validate Definition of Done for a story.
argument-hint: Provide the story key (e.g., E1-S1).
agent: kratos-orchestrator
---

Execute the KRATOS check-dod workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [check-dod/workflow.yaml](../../_kratos/lifecycle/workflows/4-implementation/check-dod/workflow.yaml) and its referenced instructions.
- Read the target story file under [../../docs/implementation-artifacts](../../docs/implementation-artifacts).
- Respect story status, checkpoints, and quality gates defined by KRATOS.
- Check all DoD criteria (acceptance criteria, subtasks, test scenarios, explicit DoD items) and report results.
