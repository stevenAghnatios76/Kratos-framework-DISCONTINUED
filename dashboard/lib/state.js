'use strict';

const { REQUEST_LOG_MAX } = require('./constants');

const AGENT_ACTIVITY_MAX = 80;

/**
 * In-memory accumulator for all dashboard metrics.
 */
class DashboardState {
  constructor() {
    this.reset();
  }

  reset() {
    this.session = {
      messages: 0,
      startTime: null,
    };

    this.tokens = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
    };

    this.cost = {
      current: 0,   // last request
      total: 0,
      byModel: {},   // { 'claude-opus-4-6': 1.23, ... }
    };

    this.context = {
      used: 0,
      percent: 0,
    };

    this.latency = {
      lastDurationMs: 0,
      lastTtftMs: 0,
      history: [],     // ring buffer of last 50 durations for sparkline
    };

    this.models = {};  // { 'claude-opus-4-6': count, ... }

    this.tools = {};   // { 'Bash': { calls: 5, totalMs: 225 }, ... }

    this.agents = {};  // { 'Explore': { calls, requestCount, tokens, cost, ... }, ... }
    this.agentActivity = []; // newest first: [{ timestamp, agent, action, detail }]

    this.streaming = {
      stalls: 0,
      totalStallMs: 0,
    };

    this.errors = {
      count: 0,
      last: null,      // { timestamp, type, message }
    };

    this.requestLog = []; // newest first, max REQUEST_LOG_MAX

    this.historical = {
      daily: [],
      totals: null,
    };

    this._seenRequestIds = new Set();
    this._seenTelemetryEventIds = new Set();
    this._telemetryCostByRequestId = new Map();
    this._pendingSubagentsByToolUseId = new Map();
    this._pendingAgentRegistrationsByToolUseId = new Map();
    this._agentNameById = new Map();
  }

  /**
   * Process a normalized event from any parser.
   * Returns true if state changed (should broadcast delta).
   */
  processEvent(event) {
    if (!event) return false;

    if (event.telemetryEventId) {
      if (this._seenTelemetryEventIds.has(event.telemetryEventId)) {
        return false;
      }
      this._seenTelemetryEventIds.add(event.telemetryEventId);
    }

    switch (event.type) {
      case 'usage':
        return this._processUsage(event);
      case 'tool_uses':
        return this._processToolUses(event);
      case 'api_success':
        return this._processApiSuccess(event);
      case 'tool_use':
        return this._processToolUse(event);
      case 'agent_call':
        return this._processAgentCall(event);
      case 'agent_spawn':
        return this._processAgentSpawn(event);
      case 'agent_registration':
        return this._processAgentRegistration(event);
      case 'streaming_stall':
        return this._processStreamingStall(event);
      case 'context_size':
        return this._processContextSize(event);
      case 'error':
        return this._processError(event);
      default:
        return false;
    }
  }

  _processUsage(event) {
    const agentName = this._resolveAgentName(event);

    // Dedup by requestId
    if (event.requestId) {
      if (this._seenRequestIds.has(event.requestId)) {
        // Update existing — find in log and update
        const idx = this.requestLog.findIndex(r => r.requestId === event.requestId);
        if (idx !== -1) {
          // Subtract old values before adding new
          const old = this.requestLog[idx];
          this.tokens.input -= old.inputTokens;
          this.tokens.output -= old.outputTokens;
          this.tokens.cacheRead -= old.cacheRead;
          this.tokens.cacheWrite -= old.cacheWrite;
          this.cost.total -= old.cost;
          if (old.model) {
            this.models[old.model] = Math.max(0, (this.models[old.model] || 0) - 1);
          }
          if (old.agentName) {
            this._adjustAgentUsage(old.agentName, old, -1);
          }
          this.requestLog[idx] = this._makeLogEntry(event, agentName);
        }
      } else {
        this._seenRequestIds.add(event.requestId);
        this.session.messages++;
        this._addToLog(event, agentName);
      }
    } else {
      this.session.messages++;
      this._addToLog(event, agentName);
    }

    if (!this.session.startTime) {
      this.session.startTime = event.timestamp;
    }

    this.tokens.input += event.inputTokens;
    this.tokens.output += event.outputTokens;
    this.tokens.cacheRead += event.cacheRead;
    this.tokens.cacheWrite += event.cacheWrite;

    this.cost.current = event.cost;
    this.cost.total += event.cost;
    this.cost.byModel[event.model] = (this.cost.byModel[event.model] || 0) + event.cost;

    this.context.used = event.contextUsed;
    this.context.percent = event.contextPercent;

    this.models[event.model] = (this.models[event.model] || 0) + 1;

    if (agentName) {
      this._touchAgent(agentName, event.timestamp);
      this._adjustAgentUsage(agentName, event, 1);
      this._setAgentStatusFromStopReason(agentName, event.stopReason);
      this._pushAgentActivity(
        event.timestamp,
        agentName,
        'generated',
        `${event.model} ${formatTokenSummary(event)}`
      );
    }

    return true;
  }

  _processToolUses(event) {
    for (const tool of event.tools) {
      if (!this.tools[tool.name]) {
        this.tools[tool.name] = { calls: 0, totalMs: 0 };
      }
      this.tools[tool.name].calls++;
    }
    return true;
  }

  _processApiSuccess(event) {
    const agentName = this._resolveAgentName(event);

    this.latency.lastDurationMs = event.durationMs;
    this.latency.lastTtftMs = event.ttftMs;
    this.latency.history.push(event.durationMs);
    if (this.latency.history.length > 50) {
      this.latency.history.shift();
    }

    this.cost.current = event.costUSD > 0 ? event.costUSD : this.cost.current;

    // Reconcile cost against a specific request, never against "last request".
    if (event.requestId && event.costUSD > 0) {
      const prevTelemetryCost = this._telemetryCostByRequestId.get(event.requestId);
      if (prevTelemetryCost == null) {
        this._telemetryCostByRequestId.set(event.requestId, event.costUSD);
      } else if (Math.abs(prevTelemetryCost - event.costUSD) > 0.000001) {
        this._telemetryCostByRequestId.set(event.requestId, event.costUSD);
      }

      const idx = this.requestLog.findIndex(r => r.requestId === event.requestId);
      if (idx !== -1) {
        const oldCost = this.requestLog[idx].cost || 0;
        const diff = event.costUSD - oldCost;
        if (Math.abs(diff) > 0.000001) {
          this.requestLog[idx].cost = event.costUSD;
          this.requestLog[idx].durationMs = event.durationMs;
          this.cost.total += diff;

          const model = this.requestLog[idx].model;
          if (model) {
            this.cost.byModel[model] = (this.cost.byModel[model] || 0) + diff;
          }

          if (this.requestLog[idx].agentName) {
            this._adjustAgentCost(this.requestLog[idx].agentName, diff);
            this.agents[this.requestLog[idx].agentName].lastDurationMs = event.durationMs;
          }
        }
      }
    }

    if (agentName) {
      this._touchAgent(agentName, event.timestamp);
      this.agents[agentName].lastDurationMs = event.durationMs;
      this._pushAgentActivity(event.timestamp, agentName, 'completed', `API response (${event.durationMs || 0}ms)`);
    }

    return true;
  }

  _processToolUse(event) {
    const name = event.toolName;
    if (!this.tools[name]) {
      this.tools[name] = { calls: 0, totalMs: 0 };
    }
    this.tools[name].calls++;
    this.tools[name].totalMs += event.durationMs;

    const agentName = this._resolveAgentName(event);
    if (agentName) {
      this._touchAgent(agentName, event.timestamp);
      this.agents[agentName].toolCalls++;
      this.agents[agentName].totalToolMs += event.durationMs;
      this.agents[agentName].status = 'running';
      this._pushAgentActivity(event.timestamp, agentName, 'used tool', `${name} (${event.durationMs || 0}ms)`);
    }

    return true;
  }

  _processAgentCall(event) {
    if (!event.agentName) return false;
    this._touchAgent(event.agentName, event.timestamp);
    this.agents[event.agentName].calls++;
    this.agents[event.agentName].status = 'running';
    this._pushAgentActivity(event.timestamp, event.agentName, 'started', 'subagent call');
    return true;
  }

  _processAgentSpawn(event) {
    if (!event.agentName || !event.toolUseId) return false;
    this._pendingSubagentsByToolUseId.set(event.toolUseId, {
      agentName: event.agentName,
      description: event.description || '',
      prompt: event.prompt || '',
      requestedModel: event.requestedModel || null,
    });

    this._touchAgent(event.agentName, event.timestamp);
    this.agents[event.agentName].description = event.description || this.agents[event.agentName].description;
    this.agents[event.agentName].promptPreview = summarizePrompt(event.prompt) || this.agents[event.agentName].promptPreview;
    this.agents[event.agentName].requestedModel = event.requestedModel || this.agents[event.agentName].requestedModel;
    this.agents[event.agentName].status = this.agents[event.agentName].status === 'idle' ? 'queued' : this.agents[event.agentName].status;

    const pendingRegistration = this._pendingAgentRegistrationsByToolUseId.get(event.toolUseId);
    if (pendingRegistration && pendingRegistration.agentId) {
      this._linkAgentIdToName(pendingRegistration.agentId, event.agentName, pendingRegistration.timestamp || event.timestamp, {
        description: event.description,
        prompt: event.prompt || pendingRegistration.prompt,
        requestedModel: event.requestedModel,
      });
      this._pendingAgentRegistrationsByToolUseId.delete(event.toolUseId);
      this._pendingSubagentsByToolUseId.delete(event.toolUseId);
    }

    this._pushAgentActivity(event.timestamp, event.agentName, 'queued', event.description || 'subagent prepared');
    return true;
  }

  _processAgentRegistration(event) {
    if (!event.agentId) return false;

    const pending = event.toolUseId ? this._pendingSubagentsByToolUseId.get(event.toolUseId) : null;
    if (!pending && event.toolUseId) {
      this._pendingAgentRegistrationsByToolUseId.set(event.toolUseId, {
        agentId: event.agentId,
        prompt: event.prompt || '',
        timestamp: event.timestamp,
      });
      return false;
    }

    const agentName = pending && pending.agentName ? pending.agentName : this._agentNameById.get(event.agentId);
    if (!agentName) return false;

    this._linkAgentIdToName(event.agentId, agentName, event.timestamp, {
      description: pending && pending.description ? pending.description : '',
      prompt: (pending && pending.prompt) || event.prompt,
      requestedModel: pending && pending.requestedModel ? pending.requestedModel : null,
    });

    if (event.toolUseId) {
      this._pendingSubagentsByToolUseId.delete(event.toolUseId);
      this._pendingAgentRegistrationsByToolUseId.delete(event.toolUseId);
    }

    this._pushAgentActivity(event.timestamp, agentName, 'attached', 'subagent session connected');
    return true;
  }

  _processStreamingStall(event) {
    this.streaming.stalls++;
    this.streaming.totalStallMs += event.stallDurationMs;
    return true;
  }

  _processContextSize(event) {
    this.context.used = event.totalTokens;
    this.context.percent = event.percentUsed;
    return true;
  }

  _processError(event) {
    this.errors.count++;
    this.errors.last = {
      timestamp: event.timestamp,
      type: event.errorType,
      message: event.message,
    };
    return true;
  }

  _makeLogEntry(event, agentName = null) {
    return {
      timestamp: event.timestamp,
      requestId: event.requestId,
      agentId: event.agentId || null,
      agentName,
      isSubagent: !!event.isSubagent,
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
      cacheRead: event.cacheRead,
      cacheWrite: event.cacheWrite,
      cost: event.cost,
      stopReason: event.stopReason,
      durationMs: this.latency.lastDurationMs,
    };
  }

  _touchAgent(agentName, timestamp) {
    if (!this.agents[agentName]) {
      this.agents[agentName] = {
        calls: 0,
        requestCount: 0,
        toolCalls: 0,
        totalToolMs: 0,
        lastSeen: null,
        lastDurationMs: 0,
        status: 'idle',
        description: '',
        promptPreview: '',
        requestedModel: null,
        agentIds: [],
        tokens: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
        },
        cost: 0,
        models: {},
      };
    }
    this.agents[agentName].lastSeen = timestamp;
  }

  _pushAgentActivity(timestamp, agent, action, detail) {
    this.agentActivity.unshift({ timestamp, agent, action, detail });
    if (this.agentActivity.length > AGENT_ACTIVITY_MAX) {
      this.agentActivity.pop();
    }
  }

  _addToLog(event, agentName = null) {
    this.requestLog.unshift(this._makeLogEntry(event, agentName));
    if (this.requestLog.length > REQUEST_LOG_MAX) {
      this.requestLog.pop();
    }
  }

  _resolveAgentName(event) {
    if (event.agentName) return event.agentName;
    if (event.agentId && this._agentNameById.has(event.agentId)) {
      return this._agentNameById.get(event.agentId);
    }
    return null;
  }

  _linkAgentIdToName(agentId, agentName, timestamp, metadata = {}) {
    if (!agentId || !agentName) return;

    this._agentNameById.set(agentId, agentName);
    this._touchAgent(agentName, timestamp);

    const agent = this.agents[agentName];
    agent.status = 'running';
    agent.description = metadata.description || agent.description;
    agent.promptPreview = summarizePrompt(metadata.prompt) || agent.promptPreview;
    agent.requestedModel = metadata.requestedModel || agent.requestedModel;
    if (!agent.agentIds.includes(agentId)) {
      agent.agentIds.push(agentId);
    }

    if (agentId !== agentName && this.agents[agentId]) {
      this._mergeAgentRecords(agentId, agentName);
    }
  }

  _mergeAgentRecords(fromName, toName) {
    if (fromName === toName || !this.agents[fromName]) return;

    this._touchAgent(toName, this.agents[fromName].lastSeen);
    const source = this.agents[fromName];
    const target = this.agents[toName];

    target.calls += source.calls;
    target.requestCount += source.requestCount;
    target.toolCalls += source.toolCalls;
    target.totalToolMs += source.totalToolMs;
    target.lastSeen = target.lastSeen && source.lastSeen
      ? (target.lastSeen > source.lastSeen ? target.lastSeen : source.lastSeen)
      : (target.lastSeen || source.lastSeen);
    target.lastDurationMs = Math.max(target.lastDurationMs || 0, source.lastDurationMs || 0);
    target.description = target.description || source.description;
    target.promptPreview = target.promptPreview || source.promptPreview;
    target.requestedModel = target.requestedModel || source.requestedModel;
    target.cost += source.cost || 0;
    target.tokens.input += source.tokens.input || 0;
    target.tokens.output += source.tokens.output || 0;
    target.tokens.cacheRead += source.tokens.cacheRead || 0;
    target.tokens.cacheWrite += source.tokens.cacheWrite || 0;

    for (const [model, count] of Object.entries(source.models || {})) {
      target.models[model] = (target.models[model] || 0) + count;
    }

    for (const agentId of source.agentIds || []) {
      if (!target.agentIds.includes(agentId)) {
        target.agentIds.push(agentId);
      }
      this._agentNameById.set(agentId, toName);
    }

    target.status = mergeAgentStatus(target.status, source.status);

    for (const entry of this.requestLog) {
      if (entry.agentName === fromName) {
        entry.agentName = toName;
      }
    }

    for (const activity of this.agentActivity) {
      if (activity.agent === fromName) {
        activity.agent = toName;
      }
    }

    delete this.agents[fromName];
  }

  _adjustAgentUsage(agentName, event, direction) {
    const agent = this.agents[agentName];
    if (!agent) return;

    agent.tokens.input = Math.max(0, agent.tokens.input + (event.inputTokens || 0) * direction);
    agent.tokens.output = Math.max(0, agent.tokens.output + (event.outputTokens || 0) * direction);
    agent.tokens.cacheRead = Math.max(0, agent.tokens.cacheRead + (event.cacheRead || 0) * direction);
    agent.tokens.cacheWrite = Math.max(0, agent.tokens.cacheWrite + (event.cacheWrite || 0) * direction);
    agent.cost = Math.max(0, agent.cost + (event.cost || 0) * direction);

    if (event.requestId) {
      agent.requestCount = Math.max(0, agent.requestCount + direction);
    }

    if (event.model) {
      agent.models[event.model] = Math.max(0, (agent.models[event.model] || 0) + direction);
      if (agent.models[event.model] === 0) {
        delete agent.models[event.model];
      }
    }
  }

  _adjustAgentCost(agentName, diff) {
    if (!agentName || !this.agents[agentName]) return;
    this.agents[agentName].cost = Math.max(0, this.agents[agentName].cost + diff);
  }

  _setAgentStatusFromStopReason(agentName, stopReason) {
    if (!agentName || !this.agents[agentName]) return;

    if (stopReason === 'end_turn') {
      this.agents[agentName].status = 'completed';
      return;
    }

    if (stopReason === 'tool_use') {
      this.agents[agentName].status = 'running';
      return;
    }

    this.agents[agentName].status = this.agents[agentName].status === 'idle' ? 'running' : this.agents[agentName].status;
  }

  _buildSubagentSummary() {
    const agents = Object.values(this.agents);
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(agent => agent.status === 'running' || agent.status === 'queued').length,
      completedAgents: agents.filter(agent => agent.status === 'completed').length,
      totalCost: agents.reduce((sum, agent) => sum + agent.cost, 0),
      totalRequests: agents.reduce((sum, agent) => sum + agent.requestCount, 0),
      totalTokens: agents.reduce(
        (sum, agent) => sum + agent.tokens.input + agent.tokens.output + agent.tokens.cacheRead + agent.tokens.cacheWrite,
        0
      ),
    };
  }

  /**
   * Set historical data from stats-cache.json.
   */
  setHistorical(data) {
    this.historical = data;
  }

  /**
   * Full snapshot for new WebSocket connections.
   */
  snapshot() {
    return {
      session: { ...this.session },
      tokens: { ...this.tokens },
      cost: { ...this.cost, byModel: { ...this.cost.byModel } },
      context: { ...this.context },
      latency: {
        lastDurationMs: this.latency.lastDurationMs,
        lastTtftMs: this.latency.lastTtftMs,
        history: [...this.latency.history],
      },
      models: { ...this.models },
      tools: JSON.parse(JSON.stringify(this.tools)),
      agents: JSON.parse(JSON.stringify(this.agents)),
      subagents: this._buildSubagentSummary(),
      agentActivity: this.agentActivity.slice(0, AGENT_ACTIVITY_MAX),
      streaming: { ...this.streaming },
      errors: { ...this.errors },
      requestLog: this.requestLog.slice(0, 50), // Send last 50 initially
      historical: this.historical,
    };
  }

  /**
   * Delta update (same shape as snapshot, clients merge).
   */
  delta() {
    return this.snapshot();
  }
}

module.exports = { DashboardState };

function summarizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return '';
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 140);
}

function formatTokenSummary(event) {
  return `${event.inputTokens || 0} in / ${event.outputTokens || 0} out`;
}

function mergeAgentStatus(left, right) {
  const rank = {
    idle: 0,
    queued: 1,
    running: 2,
    completed: 3,
  };

  return (rank[right] || 0) > (rank[left] || 0) ? right : left;
}
