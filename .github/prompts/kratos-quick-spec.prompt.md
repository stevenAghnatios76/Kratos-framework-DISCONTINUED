---
name: kratos-quick-spec
description: Run the KRATOS quick-spec workflow from GitHub Copilot for a small, scoped change.
argument-hint: Describe the small change, expected behavior, and any files or constraints.
agent: kratos-orchestrator
---

Execute the KRATOS quick-spec flow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [quick-spec/workflow.yaml](../../_kratos/lifecycle/workflows/quick-flow/quick-spec/workflow.yaml) and its referenced instructions.
- Follow the KRATOS workflow files directly in this Copilot session.
- Ask only for missing inputs that block the quick spec.
- Keep the scope small and pragmatic.
- Write or update the expected KRATOS artifact files in the documented output location when the workflow calls for it.