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

    this.agents = {};  // { 'Explore': { calls: 2, toolCalls: 10, totalToolMs: 1200, lastSeen: ts }, ... }
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
          this.requestLog[idx] = this._makeLogEntry(event);
        }
      } else {
        this._seenRequestIds.add(event.requestId);
        this.session.messages++;
        this._addToLog(event);
      }
    } else {
      this.session.messages++;
      this._addToLog(event);
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
          this.cost.total += diff;

          const model = this.requestLog[idx].model;
          if (model) {
            this.cost.byModel[model] = (this.cost.byModel[model] || 0) + diff;
          }
        }
      }
    }

    if (event.agentName) {
      this._touchAgent(event.agentName, event.timestamp);
      if (event.isAgentInvocation) {
        this.agents[event.agentName].calls++;
      }
      this._pushAgentActivity(event.timestamp, event.agentName, 'completed', 'API response');
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

    if (event.agentName) {
      this._touchAgent(event.agentName, event.timestamp);
      this.agents[event.agentName].toolCalls++;
      this.agents[event.agentName].totalToolMs += event.durationMs;
      this._pushAgentActivity(event.timestamp, event.agentName, 'used tool', `${name} (${event.durationMs || 0}ms)`);
    }

    return true;
  }

  _processAgentCall(event) {
    if (!event.agentName) return false;
    this._touchAgent(event.agentName, event.timestamp);
    this.agents[event.agentName].calls++;
    this._pushAgentActivity(event.timestamp, event.agentName, 'started', 'subagent call');
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

  _makeLogEntry(event) {
    return {
      timestamp: event.timestamp,
      requestId: event.requestId,
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
        toolCalls: 0,
        totalToolMs: 0,
        lastSeen: null,
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

  _addToLog(event) {
    this.requestLog.unshift(this._makeLogEntry(event));
    if (this.requestLog.length > REQUEST_LOG_MAX) {
      this.requestLog.pop();
    }
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
