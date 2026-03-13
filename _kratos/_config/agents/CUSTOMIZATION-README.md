# Agent Customization

Place `{agent-id}.customize.yaml` files here to override agent defaults.

## Example

`architect.customize.yaml`:

```yaml
# Override architect persona
persona_overrides:
  communication_style: "More detailed, include architecture diagrams"
  additional_principles:
    - "Always consider serverless-first"
```

These files are loaded AFTER the agent's base `.md` file and merged at runtime.

## Available Override Keys

- `persona_overrides` — Modify persona fields (communication_style, principles, etc.)
- `menu_additions` — Add extra menu items
- `menu_removals` — Remove menu items by cmd number
- `skill_additions` — Add extra skills to the agent's skill set
- `rule_additions` — Add extra rules
