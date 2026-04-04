---
name: kratos-edit-architecture
description: Run the KRATOS edit-architecture workflow to modify an existing architecture document.
argument-hint: Describe the architecture changes you need (e.g., "add caching layer").
agent: kratos-orchestrator
---

Execute the KRATOS edit-architecture workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [edit-architecture/workflow.yaml](../../_kratos/lifecycle/workflows/3-solutioning/edit-architecture/workflow.yaml) and its referenced instructions.
- Read the current architecture document under [../../docs/planning-artifacts](../../docs/planning-artifacts).
- Respect checkpoints and quality gates defined by KRATOS.
- Apply the requested changes while maintaining architectural consistency.
