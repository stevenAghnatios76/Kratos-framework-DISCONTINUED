'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const { DEFAULT_PORT, HEARTBEAT_INTERVAL_MS } = require('./lib/constants');
const { DashboardState } = require('./lib/state');
const { JsonlTailer, DirectoryWatcher, FileWatcher } = require('./lib/watcher');
const { parseSessionLine } = require('./lib/parsers/session-parser');
const { parseTelemetryFile } = require('./lib/parsers/telemetry-parser');
const { parseStatsCache } = require('./lib/parsers/stats-parser');

// --- Paths ---
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const TELEMETRY_DIR = path.join(CLAUDE_DIR, 'telemetry');
const STATS_FILE = path.join(CLAUDE_DIR, 'stats-cache.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const REPO_ROOT = path.resolve(__dirname, '..');
const REPO_PROJECT_KEY = REPO_ROOT.replace(/\//g, '-');

// --- State ---
const state = new DashboardState();
const tailers = new Map(); // filePath -> JsonlTailer
const watchers = [];
const allowedSessionIds = new Set();

// --- MIME types ---
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// --- HTTP server ---
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // Prevent path traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- WebSocket server ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Send full snapshot on connect
  ws.send(JSON.stringify({ type: 'snapshot', data: state.snapshot() }));

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Heartbeat
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => clearInterval(heartbeatInterval));

function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) { // OPEN
      ws.send(payload);
    }
  });
}

function broadcastDelta() {
  broadcast({ type: 'delta', data: state.delta() });
}

function normalizePathMaybe(p) {
  if (!p || typeof p !== 'string') return null;
  try {
    return path.resolve(p);
  } catch {
    return null;
  }
}

function isInRepo(cwd) {
  const normalized = normalizePathMaybe(cwd);
  if (!normalized) return false;
  return normalized === REPO_ROOT || normalized.startsWith(REPO_ROOT + path.sep);
}

function shouldProcessEvent(event, sourceType) {
  if (!event) return false;

  if (sourceType === 'session') {
    // Session logs always carry cwd, so we can strictly scope to this repo.
    if (!isInRepo(event.cwd)) return false;
    if (event.sessionId) allowedSessionIds.add(event.sessionId);
    return true;
  }

  if (sourceType === 'telemetry') {
    // Telemetry is global: only accept events tied to session IDs seen in this repo.
    if (event.sessionId) return allowedSessionIds.has(event.sessionId);
    // Fallback for telemetry lines that include cwd.
    if (event.cwd) return isInRepo(event.cwd);
    return false;
  }

  return false;
}

function listJsonlFilesRecursive(rootDir) {
  const files = [];

  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

// --- Session file watching ---
function tailSessionFile(filePath) {
  if (tailers.has(filePath)) return;

  const tailer = new JsonlTailer(filePath, (lines) => {
    let changed = false;
    for (const line of lines) {
      const event = parseSessionLine(line);
      if (event && shouldProcessEvent(event, 'session') && state.processEvent(event)) {
        changed = true;
      }
    }
    if (changed) broadcastDelta();
  });

  tailer.start();
  tailers.set(filePath, tailer);
}

function scanProjectSessions() {
  if (!fs.existsSync(PROJECTS_DIR)) return;

  try {
    const projectDirs = fs.readdirSync(PROJECTS_DIR);
    for (const dir of projectDirs) {
      if (dir !== REPO_PROJECT_KEY) continue;

      const projectPath = path.join(PROJECTS_DIR, dir);
      const stat = fs.statSync(projectPath);
      if (!stat.isDirectory()) continue;

      for (const jsonlPath of listJsonlFilesRecursive(projectPath)) {
        tailSessionFile(jsonlPath);
      }

      // Watch for new/changed files in this repo project directory.
      const dirWatcher = new DirectoryWatcher(
        projectPath,
        (fullPath, filename) => {
          if (filename.endsWith('.jsonl')) {
            tailSessionFile(fullPath);
          }
        },
        (fullPath, filename) => {
          if (filename.endsWith('.jsonl')) {
            tailSessionFile(fullPath);
          }
        }
      );
      dirWatcher.start();
      watchers.push(dirWatcher);

      // Also watch immediate subdirectories (e.g. subagents/) for new JSONL files.
      try {
        const entries = fs.readdirSync(projectPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const subdirPath = path.join(projectPath, entry.name);
          const subWatcher = new DirectoryWatcher(
            subdirPath,
            (fullPath, filename) => {
              if (filename.endsWith('.jsonl')) {
                tailSessionFile(fullPath);
              }
            },
            (fullPath, filename) => {
              if (filename.endsWith('.jsonl')) {
                tailSessionFile(fullPath);
              }
            }
          );
          subWatcher.start();
          watchers.push(subWatcher);
        }
      } catch {
        // Skip subdir watchers when unavailable
      }
    }
  } catch {
    // Projects dir may not exist
  }

  // Watch for new project directories
  const projectsWatcher = new DirectoryWatcher(
    PROJECTS_DIR,
    (fullPath, dirname) => {
      if (dirname !== REPO_PROJECT_KEY) return;

      // New project directory — scan it for JSONL files
      for (const jsonlPath of listJsonlFilesRecursive(fullPath)) {
        tailSessionFile(jsonlPath);
      }
    },
    () => {}
  );
  projectsWatcher.start();
  watchers.push(projectsWatcher);
}

// --- Telemetry watching ---
function scanTelemetry() {
  if (!fs.existsSync(TELEMETRY_DIR)) return;

  function processTelemetryFile(fullPath) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const events = parseTelemetryFile(content);
      let changed = false;
      for (const event of events) {
        if (shouldProcessEvent(event, 'telemetry') && state.processEvent(event)) changed = true;
      }
      if (changed) broadcastDelta();
    } catch {
      // Skip unreadable files
    }
  }

  // Initial load so dashboard has telemetry metrics immediately after startup.
  try {
    const files = fs.readdirSync(TELEMETRY_DIR);
    for (const filename of files) {
      if (!filename.endsWith('.json')) continue;
      processTelemetryFile(path.join(TELEMETRY_DIR, filename));
    }
  } catch {
    // Skip initial load on access errors
  }

  const dirWatcher = new DirectoryWatcher(
    TELEMETRY_DIR,
    (fullPath, filename) => {
      if (!filename.endsWith('.json')) return;
      processTelemetryFile(fullPath);
    },
    (fullPath, filename) => {
      if (!filename.endsWith('.json')) return;
      processTelemetryFile(fullPath);
    }
  );
  dirWatcher.start();
  watchers.push(dirWatcher);
}

// --- Stats cache watching ---
function watchStatsCache() {
  // stats-cache.json is global across all repositories, so we intentionally skip
  // ingesting it to keep this dashboard repo-scoped.
  state.setHistorical({ daily: [], totals: { totalTokens: 0, totalCost: 0, totalMessages: 0, totalSessions: 0 } });
}

// --- Start ---
const PORT = parseInt(process.env.PORT, 10) || DEFAULT_PORT;

server.listen(PORT, () => {
  console.log(`\n  KRATOS Dashboard running at http://localhost:${PORT}\n`);
  console.log(`  Watching: ${CLAUDE_DIR}`);
  console.log(`  Press Ctrl+C to stop\n`);

  scanProjectSessions();
  scanTelemetry();
  watchStatsCache();
});

// --- Cleanup ---
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  for (const tailer of tailers.values()) tailer.stop();
  for (const w of watchers) w.stop();
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const tailer of tailers.values()) tailer.stop();
  for (const w of watchers) w.stop();
  wss.close();
  server.close();
  process.exit(0);
});
