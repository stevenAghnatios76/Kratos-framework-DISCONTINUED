# Checkpoint Schema

Checkpoints are YAML files written by the workflow engine after each step completes.
They enable `/kratos-resume` to recover from context loss or session breaks.

## Schema

```yaml
workflow: string           # Workflow name (e.g., "dev-story")
workflow_path: string      # Full path to workflow.yaml
started: datetime          # ISO 8601 timestamp
last_updated: datetime     # ISO 8601 timestamp
current_step: integer      # Current step number (0 = not started)
total_steps: integer       # Total steps in workflow
steps_completed: [integer] # List of completed step numbers
active_agent: string       # Agent ID currently executing
output_file: string        # Primary output file path
key_variables: object      # Key resolved variables (user_name, sprint_id, etc.)
notes: string              # Free-text progress notes
files_touched:             # Files created/modified during workflow execution
  - path: string           # Relative path from project root
    checksum: string       # "sha256:{hex}" — via: shasum -a 256 {path}
    last_modified: string  # ISO 8601 timestamp from file system
```

## File Location

- Active checkpoints: `_kratos/_memory/checkpoints/{workflow-name}.yaml`
- Completed checkpoints: `_kratos/_memory/checkpoints/completed/{workflow-name}-{date}.yaml`

## Lifecycle

1. **Created** when a workflow starts (step 0 of N)
2. **Updated** after each step completes
3. **Archived** to `completed/` when workflow finishes successfully
4. **Deleted** if user discards via `/kratos-resume`

## Integrity Validation

On resume (`/kratos-resume`), the engine validates `files_touched` checksums:

1. For each entry in `files_touched`: run `shasum -a 256 {path}`, compare against stored checksum
2. If file deleted since checkpoint: flag as **DELETED**
3. If checksum differs: flag as **MODIFIED**
4. If all match: report "All files unchanged" and proceed
5. If mismatches found: display list, offer **Proceed** / **Start fresh** / **Review** (show `git diff`)

Old checkpoints without `files_touched` skip validation gracefully.
