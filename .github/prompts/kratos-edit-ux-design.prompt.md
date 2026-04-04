---
name: kratos-edit-ux-design
description: Run the KRATOS edit-ux-design workflow to modify an existing UX design document.
argument-hint: Describe the UX design changes you need (e.g., "update navigation flow").
agent: kratos-orchestrator
---

Execute the KRATOS edit-ux-design workflow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [edit-ux-design/workflow.yaml](../../_kratos/lifecycle/workflows/2-planning/edit-ux-design/workflow.yaml) and its referenced instructions.
- Read the current UX design document under [../../docs/planning-artifacts](../../docs/planning-artifacts).
- Respect checkpoints and quality gates defined by KRATOS.
- Apply the requested changes while maintaining design consistency.
