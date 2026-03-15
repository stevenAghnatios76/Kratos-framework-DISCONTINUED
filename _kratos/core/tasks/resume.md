# KRATOS Resume

Use `/kratos-resume` to recover the most recent workflow checkpoint.

## Expected behavior

1. Load the latest checkpoint from `_kratos/_memory/checkpoints/`
2. Validate any recorded `files_touched` checksums before resuming
3. If files changed, offer: Proceed, Start fresh, or Review
4. Resume from the saved workflow step only after validation succeeds or the user explicitly proceeds

## Notes

- The workflow engine remains the source of truth for checkpoint format and resume behavior
- If no active checkpoint exists, tell the user there is nothing to resume