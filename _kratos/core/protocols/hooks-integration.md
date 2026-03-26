# Hooks Integration Protocol

## Where Hooks Fire in the Workflow Engine

The hook executor is called at these points in `workflow.xml` execution:

### pre-workflow
- **When:** After Step 2 (Preflight Validation) passes, before Step 3 (Load Agent)
- **Context:** `{ workflow_name, story_key }`
- **If halted:** Workflow does not start

### post-step
- **When:** After Step 6 processes each instruction step
- **Context:** `{ workflow_name, step_number, story_key, files_modified }`
- **If halted:** Workflow stops at current step

### pre-gate
- **When:** Before Step 2 (pre-start gates) and Step 7 (post-complete gates)
- **Context:** `{ workflow_name, gate_name }`
- **If halted:** Gate check is skipped, workflow halts

### post-gate
- **When:** After any quality gate check completes
- **Context:** `{ workflow_name, gate_name, gate_result: 'passed' | 'failed' }`
- **If halted:** N/A (post-gate can only warn or skip)

### pre-commit
- **When:** Before `git commit` in dev-story workflow
- **Context:** `{ workflow_name, story_key, files_modified }`
- **If halted:** Commit does not execute

### post-review
- **When:** After any of the 6 review gate workflows complete
- **Context:** `{ workflow_name, review_type, review_result, story_key }`
- **If halted:** N/A (post-review can only warn or skip)

### on-error
- **When:** Any step throws an error or fails
- **Context:** `{ workflow_name, step_number, error_message, story_key }`
- **If halted:** N/A (on-error is best-effort notification)

### on-resume
- **When:** `/kratos-resume` activates checkpoint recovery
- **Context:** `{ workflow_name, step_number, checkpoint_path }`
- **If halted:** Resume aborts, user must fix the hook issue first

### post-learning
- **When:** After a trajectory is scored by the learning system
- **Context:** `{ agent_id, workflow_name, story_key, score }`
- **If halted:** N/A (post-learning is notification only)
