# KRATOS Workspace Instructions for GitHub Copilot

This repository contains KRATOS, a fork of the original GAIA framework.

## Core rules

- Use KRATOS naming, paths, and commands: `kratos-framework`, `/kratos-*`, `_kratos/`.
- Preserve explicit upstream attribution when editing docs: KRATOS is forked from `https://github.com/jlouage/Gaia-framework`.
- Prefer role-based developer agents over language-specific personas.
  Current developer roles are `senior-frontend`, `senior-backend`, and `senior-fullstack`.
- Keep changes minimal and consistent with the framework structure under `_kratos/`.

## Editor behavior

- Claude Code supports slash commands with model frontmatter. GitHub Copilot does not.
- When working from GitHub Copilot, operate directly on the relevant files and workflows instead of assuming slash-command routing will happen automatically.
- If documenting usage, distinguish Claude Code command flows from GitHub Copilot file-based workflows.

## Installer and repo source

- The installer supports `KRATOS_REPO_URL` to override the Git clone source for a user fork or private mirror.
- Keep `kratos-install.sh` and `bin/kratos-framework.js` aligned when changing install source behavior.
- Keep `_kratos/_config/global.yaml` and README examples aligned with installer behavior.

## Lightweight profile

- Support the `--minimal` install profile when editing install docs or validation logic.
- Minimal installs should focus on core orchestration, quick-flow workflows, and the senior developer entrypoints.

## Documentation updates

- README must mention GitHub Copilot support.
- README must state that KRATOS was forked from GAIA.
- Avoid reintroducing stack-specific developer tables or `/gaia-*` command examples.
