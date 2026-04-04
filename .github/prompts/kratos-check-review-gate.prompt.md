---
name: kratos-check-review-gate
description: Run the KRATOS check-review-gate workflow to inspect review gate status for a story.
argument-hint: Provide the story key (e.g., E1-S1).
agent: kratos-orchestrator
---

Execute the KRATOS check-review-gate workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [check-review-gate/workflow.yaml](../../_kratos/lifecycle/workflows/4-implementation/check-review-gate/workflow.yaml) and its referenced instructions.
- Read the target story file under [../../docs/implementation-artifacts](../../docs/implementation-artifacts).
- Respect story status, checkpoints, and quality gates defined by KRATOS.
- Check composite review gate status and transition story to done if all 6 reviews pass.
