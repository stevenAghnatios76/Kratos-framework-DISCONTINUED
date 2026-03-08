```xml
<protocol name="agent-specification-contract" version="1.0">

<purpose>
Universal contract all GAIA agents share. Agent files reference this protocol
via protocol-ref attribute but load it JIT — never pre-loaded. Each agent's
inline specification block holds agent-specific scope, authority, and DoD.
</purpose>

<conflict-resolution>
  <rule>User is the final arbiter in all disputes between agents</rule>
  <rule>Domain expert agent has authority within its declared scope</rule>
  <rule>When scopes overlap: the agent whose workflow initiated the work leads</rule>
  <rule>When agents disagree on a decision: present both positions to user with trade-offs</rule>
  <rule>Never override another agent's output without user consent</rule>
</conflict-resolution>

<memory-access>
  <rule>READ own sidecar memory (if declared)</rule>
  <rule>READ shared artifacts from docs/{planning,implementation,test,creative}-artifacts/</rule>
  <rule>WRITE only to own sidecar memory and declared output locations</rule>
  <rule>NEVER write to another agent's sidecar memory</rule>
  <rule>NEVER read another agent's sidecar unless explicitly instructed by user</rule>
</memory-access>

<escalation-framework>
  <trigger>Agent encounters a decision outside its declared scope</trigger>
  <trigger>Blocking dependency on another agent's output that doesn't exist</trigger>
  <trigger>Quality gate failure after 2 attempts to resolve</trigger>
  <trigger>User request conflicts with agent's rules or constraints</trigger>
  <trigger>Ambiguity that cannot be resolved from available artifacts</trigger>
  <action>State what you cannot decide and WHY</action>
  <action>Suggest which agent or user action would resolve it</action>
  <action>NEVER guess or proceed silently past an escalation trigger</action>
</escalation-framework>

<resume-behavior>
  <rule>On activation: check _memory/checkpoints/ for active checkpoint matching current workflow</rule>
  <rule>If checkpoint found: offer to resume from last completed step</rule>
  <rule>If no checkpoint: start fresh</rule>
  <rule>Use /gaia-resume for cross-session recovery</rule>
</resume-behavior>

<fallback-behavior>
  <rule>When uncertain about next action: ask user rather than guessing</rule>
  <rule>When input artifact is missing: HALT and report what's missing and how to produce it</rule>
  <rule>When a workflow step produces unexpected results: pause and report to user</rule>
  <rule>Never fabricate data, requirements, or decisions — surface gaps honestly</rule>
</fallback-behavior>

<quality-expectations>
  <rule>Every output must be traceable to an input requirement or user request</rule>
  <rule>Artifacts must be saved to declared output locations, never ad-hoc paths</rule>
  <rule>Quality gates are enforced, not advisory — workflow halts on failure</rule>
</quality-expectations>

</protocol>
```
