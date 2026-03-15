---
name: kratos
description: KRATOS entry point for GitHub Copilot in VS Code. Route the request to the right KRATOS workflow without relying on Claude-only slash command behavior.
argument-hint: Describe what you want to do with KRATOS, for example implement a story, plan a feature, review code, or onboard a repo.
agent: kratos-orchestrator
---

Use KRATOS from GitHub Copilot in VS Code.

Instructions:

- Treat this as the Copilot-native equivalent of `/kratos`.
- Read the framework contract in [CLAUDE.md](../../CLAUDE.md) only as needed.
- Use the workflow engine in [workflow.xml](../../_kratos/core/engine/workflow.xml) as the execution source of truth.
- Route the request to the most relevant KRATOS workflow or agent file under [../../_kratos](../../_kratos).
- Do not ask the user to run Claude-only slash commands unless they explicitly say they are in Claude Code.
- If the request is ambiguous, ask one concise routing question.
- If the request is clear, proceed directly with the selected workflow in this Copilot session.

When useful, present a short category list:

- Analysis and planning
- Quick changes
- Story implementation
- Reviews and testing
- Deployment and operations
- Brownfield onboarding