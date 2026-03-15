'use strict';

const { MODEL_PRICING, CONTEXT_WINDOW_SIZE } = require('../constants');

/**
 * Parse a single JSONL line from a Claude Code session file.
 * Returns all normalized events found on the line.
 */
function parseSessionEvents(line, options = {}) {
  if (!line || !line.trim()) return null;

  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }

  const events = [];
  const filePath = options.filePath || null;
  const isSubagent = isSubagentSession(obj, filePath);
  const agentId = obj.agentId || extractAgentIdFromPath(filePath);

  // Assistant messages with usage data
  if (obj.type === 'assistant' && obj.message && obj.message.usage) {
    const usage = obj.message.usage;
    const model = obj.message.model || obj.model || 'unknown';
    const requestId = obj.requestId || obj.message.id || null;
    const stopReason = obj.message.stop_reason || obj.stopReason || null;

    const inputTokens = toNumber(usage.input_tokens);
    const outputTokens = toNumber(usage.output_tokens);
    const cacheRead = toNumber(usage.cache_read_input_tokens, usage.cache_read);
    const cacheWrite = toNumber(usage.cache_creation_input_tokens, usage.cache_creation);

    const cost = computeCost(model, inputTokens, outputTokens, cacheRead, cacheWrite);
    const contextUsed = inputTokens + cacheRead + cacheWrite;
    const contextPercent = Math.min(100, (contextUsed / CONTEXT_WINDOW_SIZE) * 100);

    events.push({
      type: 'usage',
      timestamp: obj.timestamp || Date.now(),
      requestId,
      sessionId: obj.sessionId || obj.session_id || null,
      cwd: obj.cwd || null,
      agentId,
      isSubagent,
      model: normalizeModel(model),
      stopReason,
      inputTokens,
      outputTokens,
      cacheRead,
      cacheWrite,
      cost,
      contextUsed,
      contextPercent,
    });
  }

  // Tool use results
  if (obj.type === 'tool_result' || (obj.type === 'assistant' && obj.message && obj.message.content)) {
    const toolUses = extractToolUses(obj);
    if (toolUses.length > 0) {
      events.push({
        type: 'tool_uses',
        timestamp: obj.timestamp || Date.now(),
        sessionId: obj.sessionId || obj.session_id || null,
        cwd: obj.cwd || null,
        agentId,
        isSubagent,
        tools: toolUses,
      });
    }
  }

  const agentLaunches = extractAgentLaunches(obj);
  if (agentLaunches.length > 0) {
    for (const launch of agentLaunches) {
      events.push({
        type: 'agent_spawn',
        timestamp: obj.timestamp || Date.now(),
        sessionId: obj.sessionId || obj.session_id || null,
        cwd: obj.cwd || null,
        agentName: launch.agentName,
        description: launch.description,
        prompt: launch.prompt,
        requestedModel: launch.model,
        toolUseId: launch.toolUseId,
      });
    }
  }

  const registration = extractAgentRegistration(obj);
  if (registration) {
    events.push({
      type: 'agent_registration',
      timestamp: obj.timestamp || Date.now(),
      sessionId: obj.sessionId || obj.session_id || null,
      cwd: obj.cwd || null,
      agentId: registration.agentId,
      toolUseId: registration.toolUseId,
      prompt: registration.prompt,
    });
  }

  return events.length > 0 ? events : null;
}

function parseSessionLine(line, options = {}) {
  const events = parseSessionEvents(line, options);
  return events && events.length > 0 ? events[0] : null;
}

function toNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function extractToolUses(obj) {
  const tools = [];
  if (obj.message && Array.isArray(obj.message.content)) {
    for (const block of obj.message.content) {
      if (block.type === 'tool_use') {
        tools.push({ name: block.name, id: block.id });
      }
    }
  }
  return tools;
}

function extractAgentLaunches(obj) {
  const launches = [];
  if (!obj.message || !Array.isArray(obj.message.content)) return launches;

  for (const block of obj.message.content) {
    if (block.type !== 'tool_use' || block.name !== 'Agent') continue;
    launches.push({
      toolUseId: block.id || null,
      agentName: block.input && block.input.subagent_type ? block.input.subagent_type : 'unknown',
      description: block.input && block.input.description ? block.input.description : '',
      prompt: block.input && block.input.prompt ? block.input.prompt : '',
      model: block.input && block.input.model ? block.input.model : null,
    });
  }

  return launches;
}

function extractAgentRegistration(obj) {
  if (obj.type !== 'progress' || !obj.data || obj.data.type !== 'agent_progress') {
    return null;
  }

  return {
    agentId: obj.data.agentId || obj.agentId || null,
    toolUseId: obj.parentToolUseID || obj.parentToolUseId || null,
    prompt: obj.data.prompt || '',
  };
}

function isSubagentSession(obj, filePath) {
  if (obj && obj.isSidechain) return true;
  return typeof filePath === 'string' && filePath.includes('/subagents/');
}

function extractAgentIdFromPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const match = filePath.match(/\/subagents\/agent-([^.\/]+)\.jsonl$/);
  return match ? match[1] : null;
}

function normalizeModel(model) {
  if (!model) return 'unknown';
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'claude-opus-4-6';
  if (m.includes('sonnet')) return 'claude-sonnet-4-6';
  if (m.includes('haiku')) return 'claude-haiku-4-5';
  return model;
}

function computeCost(model, input, output, cacheRead, cacheWrite) {
  const normalized = normalizeModel(model);
  const pricing = MODEL_PRICING[normalized];
  if (!pricing) return 0;

  return (
    (input * pricing.input / 1_000_000) +
    (output * pricing.output / 1_000_000) +
    (cacheRead * pricing.cacheRead / 1_000_000) +
    (cacheWrite * pricing.cacheWrite / 1_000_000)
  );
}

/**
 * Parse multiple JSONL lines, dedup by requestId (keep last).
 */
function parseSessionLines(lines) {
  const byRequestId = new Map();
  const events = [];

  for (const line of lines) {
    const lineEvents = parseSessionEvents(line) || [];
    for (const event of lineEvents) {
      if (event.type === 'usage' && event.requestId) {
        byRequestId.set(event.requestId, event);
      } else {
        events.push(event);
      }
    }
  }

  // Merge deduped usage events
  return [...byRequestId.values(), ...events].sort((a, b) => a.timestamp - b.timestamp);
}

module.exports = { parseSessionEvents, parseSessionLine, parseSessionLines, normalizeModel, computeCost };
