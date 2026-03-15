---
name: kratos-quick-dev
description: Run the KRATOS quick-dev workflow from GitHub Copilot to implement a small approved change.
argument-hint: Describe the quick spec or the small implementation task to complete.
agent: kratos-orchestrator
---

Execute the KRATOS quick-dev flow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [quick-dev/workflow.yaml](../../_kratos/lifecycle/workflows/quick-flow/quick-dev/workflow.yaml) and its referenced instructions.
- Implement the requested change directly from the KRATOS workflow files rather than relying on Claude-only slash commands.
- Use the existing repo style and keep changes minimal.
- Run relevant verification steps when the workflow or changed files require it.