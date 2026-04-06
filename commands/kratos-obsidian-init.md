---
name: 'obsidian-init'
description: 'Initialize Obsidian vault for KRATOS documentation. Creates .obsidian/ config and MOC index files.'
model: sonnet
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS:

<steps CRITICAL="TRUE">
1. READ {project-root}/_kratos/_config/global.yaml
2. CHECK if obsidian.enabled is true. If false:
   a. ASK user: "Obsidian integration is currently disabled. Enable it now? [Y/n]"
   b. If yes: set obsidian.enabled to true in global.yaml
   c. If no: report "Obsidian integration remains disabled" and EXIT
3. RESOLVE vault_root from config (default: {project-root}/docs)
4. CREATE {vault_root}/.obsidian/ directory
5. COPY vault template configs from {project-root}/_kratos/lifecycle/obsidian-vault-template/ to {vault_root}/.obsidian/:
   - app.json
   - core-plugins.json
   - community-plugins.json
   - graph.json
   - appearance.json
6. CREATE {vault_root}/{obsidian.moc_dir}/ directory (default: _obsidian-moc)
7. CREATE {vault_root}/{obsidian.moc_dir}/attachments/ directory
8. GENERATE MOC (Map of Content) index files:
   a. home.md — master vault index with links to all MOC files and Dataview dashboards:
      - Sprint Status table (stories by status, priority, sprint)
      - Review Gate Progress (stories in review status)
      - Risk Overview (high-risk stories)
   b. planning-moc.md — Dataview lists for PRDs, architecture docs, UX designs, product briefs
   c. implementation-moc.md — Stories grouped by status, sprint plans, epic status reports
   d. test-moc.md — Test plans, review reports, traceability matrices
   e. creative-moc.md — All creative artifacts
   Each MOC file must have:
   - YAML frontmatter with tags: [kratos/moc, kratos/phase/{phase}] and aliases
   - Dataview query blocks (if obsidian.dataview_queries is true)
   - Manual wikilinks to known artifact files in that directory
9. SCAN existing artifact files in {vault_root}/planning-artifacts/, implementation-artifacts/, test-artifacts/, creative-artifacts/
10. For each existing artifact file found:
    - Run the obsidian-metadata protocol: load {project-root}/_kratos/core/protocols/obsidian-metadata.xml
    - Enrich the file's frontmatter with tags, aliases, cssclass
    - Inject wikilinks between related artifacts
11. REPORT summary:
    - Files created (vault config + MOC files)
    - Artifacts enriched (count per directory)
    - Suggested next steps:
      a. Open {vault_root}/ as a vault in Obsidian
      b. Install recommended community plugins: Dataview, Graph Analysis
      c. Open Graph View to see the project knowledge graph
</steps>

$ARGUMENTS
