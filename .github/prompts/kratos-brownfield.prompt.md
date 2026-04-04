---
name: kratos-brownfield
description: Run the KRATOS brownfield onboarding workflow from GitHub Copilot for an existing repository.
argument-hint: Provide the project path or describe the existing codebase you want to onboard.
agent: kratos-orchestrator
---

Execute the KRATOS brownfield onboarding flow directly in GitHub Copilot.

- Load the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml).
- Then inspect [brownfield-onboarding/workflow.yaml](../../_kratos/lifecycle/workflows/anytime/brownfield-onboarding/workflow.yaml) and its referenced instructions.
- Scan the existing codebase and generate the expected brownfield planning artifacts in the documented output locations.
- Focus on discovery, gaps, architecture, and migration risks before proposing new implementation work.
- Ask only for missing inputs that block the onboarding flow.