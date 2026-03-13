# Step 1: Agent Loading

1. Read `_kratos/_config/agent-manifest.csv` to discover all installed agents
2. Ask the user which agents to invite to the discussion:
   - Option A: "All agents" — load all from manifest
   - Option B: "By module" — let user pick modules (lifecycle, dev, creative, testing)
   - Option C: "Specific agents" — let user pick individual agents by name
3. For each selected agent, load their persona (name, title, communication_style, principles)
4. Do NOT load full agent files — only extract persona summaries
5. Present the guest list to the user for confirmation
6. Ask for the discussion topic or question
