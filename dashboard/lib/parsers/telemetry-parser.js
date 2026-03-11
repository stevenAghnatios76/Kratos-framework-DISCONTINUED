'use strict';

/**
 * Parse telemetry JSON files from ~/.claude/telemetry/.
 * Extracts API success, tool usage, streaming stalls, and context size events.
 */
function parseTelemetryFile(content) {
  if (!content || !content.trim()) return [];

  const events = parseTelemetryContent(content);
  const results = [];

  for (const event of events) {
    const parsed = parseTelemetryEvent(event);
    if (parsed) results.push(parsed);
  }

  return results;
}

function parseTelemetryContent(content) {
  // 1) Try normal JSON first (single object or array)
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // 2) Fall back to JSONL (one JSON object per line)
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch {
        // Ignore malformed lines
      }
    }
    return items;
  }
}

function parseTelemetryEvent(event) {
  const normalized = normalizeTelemetryEvent(event);
  if (!normalized) return null;

  const { name, timestamp, props } = normalized;

  switch (name) {
    case 'tengu_api_success': {
      const querySource = props.query_source || props.querySource;
      const agentName =
        props.agent_name ||
        props.agentName ||
        props.agent_type ||
        extractAgentNameFromQuerySource(querySource);
      return {
        type: 'api_success',
        timestamp,
        sessionId: props.session_id || props.sessionId || null,
        cwd: props.cwd || props.current_working_directory || props.working_directory || null,
        model: props.model || 'unknown',
        durationMs: toNumber(props.duration_ms, props.durationMs),
        ttftMs: toNumber(props.ttft_ms, props.ttftMs),
        costUSD: toNumber(props.cost_usd, props.costUSD, props.costUsd),
        inputTokens: toNumber(props.input_tokens, props.inputTokens, props.uncached_input_tokens, props.uncachedInputTokens),
        outputTokens: toNumber(props.output_tokens, props.outputTokens),
        agentName: agentName || null,
        telemetryEventId: props.event_id || props.eventId || null,
        requestId: props.request_id || props.requestId || null,
        isAgentInvocation: !!extractAgentNameFromQuerySource(querySource),
      };
    }

    case 'tengu_tool_use_success': {
      const agentName =
        props.agent_name ||
        props.agentName ||
        props.agent_type ||
        extractAgentNameFromQuerySource(props.query_source || props.querySource);
      return {
        type: 'tool_use',
        timestamp,
        sessionId: props.session_id || props.sessionId || null,
        cwd: props.cwd || props.current_working_directory || props.working_directory || null,
        toolName: props.tool_name || props.toolName || 'unknown',
        durationMs: toNumber(props.duration_ms, props.durationMs),
        agentName: agentName || null,
        telemetryEventId: props.event_id || props.eventId || null,
      };
    }

    case 'tengu_agent_tool_selected': {
      return {
        type: 'agent_call',
        timestamp,
        sessionId: props.session_id || props.sessionId || null,
        cwd: props.cwd || props.current_working_directory || props.working_directory || null,
        agentName: props.agent_type || props.agentName || props.agent_name || 'unknown',
        telemetryEventId: props.event_id || props.eventId || null,
      };
    }

    case 'tengu_streaming_stall': {
      return {
        type: 'streaming_stall',
        timestamp,
        sessionId: props.session_id || props.sessionId || null,
        cwd: props.cwd || props.current_working_directory || props.working_directory || null,
        stallDurationMs: toNumber(props.stall_duration_ms, props.stallDurationMs),
        telemetryEventId: props.event_id || props.eventId || null,
      };
    }

    case 'tengu_context_size': {
      return {
        type: 'context_size',
        timestamp,
        sessionId: props.session_id || props.sessionId || null,
        cwd: props.cwd || props.current_working_directory || props.working_directory || null,
        totalTokens: toNumber(props.total_tokens, props.totalTokens),
        percentUsed: toNumber(props.percent_used, props.percentUsed),
        telemetryEventId: props.event_id || props.eventId || null,
      };
    }

    case 'tengu_api_error':
    case 'tengu_error': {
      return {
        type: 'error',
        timestamp,
        sessionId: props.session_id || props.sessionId || null,
        cwd: props.cwd || props.current_working_directory || props.working_directory || null,
        errorType: props.error_type || props.errorType || 'unknown',
        message: props.message || props.error_message || '',
        telemetryEventId: props.event_id || props.eventId || null,
      };
    }

    default:
      return null;
  }
}

function normalizeTelemetryEvent(event) {
  if (!event || typeof event !== 'object') return null;

  // Newer telemetry files wrap data as { event_type, event_data }
  if (event.event_data && typeof event.event_data === 'object') {
    const data = event.event_data;
    const metadata = parseMaybeJson(data.additional_metadata);
    const props = {
      ...(metadata || {}),
      ...data,
      ...(data.properties || {}),
    };
    return {
      name: data.event_name || data.event,
      timestamp: data.client_timestamp || data.timestamp || data.ts || Date.now(),
      props,
    };
  }

  // Legacy shape: { event, properties }
  if (event.event) {
    return {
      name: event.event,
      timestamp: event.timestamp || event.ts || Date.now(),
      props: {
        ...event,
        ...(event.properties || {}),
      },
    };
  }

  return null;
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

function extractAgentNameFromQuerySource(querySource) {
  if (!querySource || typeof querySource !== 'string') return null;
  const match = querySource.match(/^agent:[^:]+:([^:]+)$/i);
  return match ? match[1] : null;
}

module.exports = { parseTelemetryFile, parseTelemetryEvent };
