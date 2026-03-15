---
name: kratos-dev-story
description: Run the KRATOS dev-story workflow from GitHub Copilot to implement a story from the implementation artifacts.
argument-hint: Provide the story key or describe the story to implement.
agent: kratos-orchestrator
---

Execute the KRATOS dev-story workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [dev-story/workflow.yaml](../../_kratos/lifecycle/workflows/4-implementation/dev-story/workflow.yaml) and its referenced instructions.
- Read the target story file under [../../docs/implementation-artifacts](../../docs/implementation-artifacts).
- Respect story status, checkpoints, and quality gates defined by KRATOS.
- Implement the code changes in this Copilot session and update artifacts only where the workflow expects them.