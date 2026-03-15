---
name: kratos-help
description: Suggest the next KRATOS workflow in GitHub Copilot based on the current repository state and the user's goal.
argument-hint: Describe your goal or ask for the best next KRATOS step.
agent: kratos-orchestrator
---

Help the user choose the next KRATOS workflow inside GitHub Copilot.

- Inspect [CLAUDE.md](../../CLAUDE.md), [workflow.xml](../../_kratos/core/engine/workflow.xml), and the artifacts under [../../docs](../../docs) only as needed.
- Determine the most relevant next KRATOS workflow for the user's goal and current repo state.
- Present the top 3 to 5 options with a one-line reason for each.
- For GitHub Copilot, explain what files or workflows you will inspect directly instead of telling the user to rely on Claude slash-command routing.
- If one option is clearly best, proceed with it after a brief confirmation.