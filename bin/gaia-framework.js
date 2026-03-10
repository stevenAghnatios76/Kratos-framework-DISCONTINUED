#!/usr/bin/env node

// ─────────────────────────────────────────────────────────────────────────────
// GAIA Framework — npm CLI wrapper
// Clones the GAIA repo, delegates to gaia-install.sh, and cleans up.
// ─────────────────────────────────────────────────────────────────────────────

const { execSync, execFileSync } = require("child_process");
const { mkdtempSync, rmSync, existsSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");

const REPO_URL = "https://github.com/jlouage/Gaia-framework.git";
const SCRIPT_NAME = "gaia-install.sh";
const IS_WINDOWS = process.platform === "win32";

let tempDir = null;

// ─── Helpers ────────────────────────────────────────────────────────────────

function findBash() {
  if (!IS_WINDOWS) return "bash";

  // Try bash in PATH first (WSL, Git Bash in PATH, etc.)
  try {
    execSync("bash --version", { stdio: "ignore" });
    return "bash";
  } catch {}

  // Try Git for Windows default locations
  const gitBashPaths = [
    join(process.env.ProgramFiles || "C:\\Program Files", "Git", "bin", "bash.exe"),
    join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Git", "bin", "bash.exe"),
    join(process.env.LOCALAPPDATA || "", "Programs", "Git", "bin", "bash.exe"),
  ];

  for (const p of gitBashPaths) {
    if (existsSync(p)) return p;
  }

  return null;
}

function fail(message) {
  console.error(`\x1b[31m✖\x1b[0m  ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(`\x1b[34mℹ\x1b[0m  ${message}`);
}

function cleanup() {
  if (tempDir && existsSync(tempDir)) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}

function ensureGit() {
  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    fail(
      "git is required but was not found.\n" +
        "   Install git: https://git-scm.com/downloads"
    );
  }
}

function showUsage() {
  console.log(`
\x1b[1mGAIA Framework — npm installer\x1b[0m

Usage: npx gaia-framework <command> [options] [target]

Commands:
  init       Install GAIA into a project
  update     Update framework files (preserves config and memory)
  validate   Check installation integrity
  status     Show installation info

Options:
  --yes             Skip confirmation prompts
  --dry-run         Show what would be done without making changes
  --verbose         Show detailed progress
  --help            Show this help message

Examples:
  npx gaia-framework init .
  npx gaia-framework init ~/my-new-project
  npx gaia-framework update .
  npx gaia-framework validate .
  npx gaia-framework status .
  npx gaia-framework init --yes ~/my-project
`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  // Handle help / no args
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    const pkg = require("../package.json");
    console.log(`gaia-framework v${pkg.version}`);
    process.exit(0);
  }

  // Validate command
  const command = args[0];
  const validCommands = ["init", "update", "validate", "status"];
  if (!validCommands.includes(command)) {
    fail(`Unknown command: ${command}\n   Run 'npx gaia-framework --help' for usage.`);
  }

  // Ensure git is available
  ensureGit();

  // Clone the repo to a temp directory
  tempDir = mkdtempSync(join(tmpdir(), "gaia-framework-"));

  // Register cleanup for all exit scenarios
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });

  info("Cloning GAIA framework from GitHub...");

  try {
    execSync(`git clone --depth 1 ${REPO_URL} "${tempDir}"`, {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    fail(
      `Failed to clone from ${REPO_URL}\n` +
        `   ${err.stderr ? err.stderr.toString().trim() : "Check your network connection."}`
    );
  }

  // Locate the installer script
  const scriptPath = join(tempDir, SCRIPT_NAME);
  if (!existsSync(scriptPath)) {
    fail(`Installer script not found in cloned repo: ${SCRIPT_NAME}`);
  }

  // Build the shell command: inject --source pointing to the temp clone
  // so the shell script doesn't need to clone again
  const passthrough = args.slice(0);
  // Insert --source right after the command
  passthrough.splice(1, 0, "--source", tempDir);

  // Locate bash (critical for Windows support)
  const bashPath = findBash();
  if (!bashPath) {
    fail(
      "bash is required but was not found.\n" +
        "   On Windows, install Git for Windows (https://git-scm.com/downloads/win)\n" +
        "   which includes bash. Then re-run this command."
    );
  }

  info("Running installer...\n");

  try {
    execFileSync(bashPath, [scriptPath, ...passthrough], {
      stdio: "inherit",
      env: { ...process.env, GAIA_SOURCE: tempDir },
    });
  } catch (err) {
    process.exit(err.status || 1);
  }
}

main();
