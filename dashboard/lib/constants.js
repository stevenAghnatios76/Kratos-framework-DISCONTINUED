'use strict';

// Pricing per million tokens (USD)
const MODEL_PRICING = {
  'claude-opus-4-6':   { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheWrite: 18.75 },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00, cacheRead: 0.30,  cacheWrite: 3.75  },
  'claude-haiku-4-5':  { input: 0.80,  output: 4.00,  cacheRead: 0.08,  cacheWrite: 1.00  },
  // Aliases used in session files
  'opus':   { input: 15.00, output: 75.00, cacheRead: 1.50,  cacheWrite: 18.75 },
  'sonnet': { input: 3.00,  output: 15.00, cacheRead: 0.30,  cacheWrite: 3.75  },
  'haiku':  { input: 0.80,  output: 4.00,  cacheRead: 0.08,  cacheWrite: 1.00  },
};

const CONTEXT_WINDOW_SIZE = 200_000;

const DEFAULT_PORT = 3456;

const HEARTBEAT_INTERVAL_MS = 30_000;

const DEBOUNCE_MS = 100;

const REQUEST_LOG_MAX = 200;

module.exports = {
  MODEL_PRICING,
  CONTEXT_WINDOW_SIZE,
  DEFAULT_PORT,
  HEARTBEAT_INTERVAL_MS,
  DEBOUNCE_MS,
  REQUEST_LOG_MAX,
};
