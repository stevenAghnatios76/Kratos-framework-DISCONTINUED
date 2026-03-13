---
name: 'build-configs'
description: 'Regenerate pre-resolved config files. Run after changing global.yaml or any module config.'
model: sonnet
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS:

<steps CRITICAL="TRUE">
1. LOAD {project-root}/_kratos/_config/global.yaml
2. For each module (lifecycle, dev, creative, testing):
   a. Load {module}/config.yaml
   b. Resolve all {config_source}:field references against global.yaml
   c. Resolve {project-root} to actual path
3. For each workflow.yaml found in the module:
   a. Resolve all variable references
   b. Write fully-resolved YAML to {module}/.resolved/{workflow-name}.yaml
4. Report: number of configs resolved, any unresolvable variables found
</steps>

$ARGUMENTS
