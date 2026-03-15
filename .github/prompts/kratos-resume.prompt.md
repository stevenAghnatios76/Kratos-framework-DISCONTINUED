---
name: kratos-resume
description: Resume the latest KRATOS checkpoint in GitHub Copilot by validating the saved workflow context and continuing from the last completed step.
argument-hint: Optionally describe the interrupted workflow or checkpoint you want to resume.
agent: kratos-orchestrator
---

Resume KRATOS work directly in GitHub Copilot.

- Inspect [resume.md](../../_kratos/core/tasks/resume.md) and the checkpoint files under [../../_kratos/_memory/checkpoints](../../_kratos/_memory/checkpoints).
- Validate any recorded `files_touched` information before resuming.
- If there is no active checkpoint, say so clearly.
- If multiple checkpoints exist, choose the latest active one unless the user specifies otherwise.
- Continue work from the saved workflow step using the KRATOS engine rules.