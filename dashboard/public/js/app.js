/* KRATOS Dashboard — WebSocket client + DOM rendering */

(function () {
  'use strict';

  // --- State ---
  let state = null;
  let ws = null;
  let reconnectDelay = 1000;
  const MAX_RECONNECT = 30000;
  let elapsedTimer = null;
  const ACTIVITY_COLUMNS = [
    { key: 'analysis', label: 'Analysis', keywords: ['analy', 'research', 'discover', 'inspect', 'review'] },
    { key: 'planning', label: 'Planning', keywords: ['plan', 'spec', 'design', 'scope', 'estimate'] },
    { key: 'solutioning', label: 'Solutioning', keywords: ['architect', 'solution', 'model', 'approach'] },
    { key: 'implementation', label: 'Implementation', keywords: ['implement', 'edit', 'patch', 'code', 'tool', 'bash', 'write'] },
    { key: 'deployment', label: 'Deployment', keywords: ['deploy', 'release', 'publish', 'merge', 'ship'] },
  ];

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- WebSocket ---
  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}`);

    ws.onopen = () => {
      reconnectDelay = 1000;
      setConnectionStatus(true);
    };

    ws.onclose = () => {
      setConnectionStatus(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'snapshot') {
          state = msg.data;
          renderAll();
        } else if (msg.type === 'delta') {
          state = msg.data;
          renderAll();
        }
        // heartbeat messages are ignored (keep-alive)
      } catch {
        // Ignore parse errors
      }
    };
  }

  function scheduleReconnect() {
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT);
      connect();
    }, reconnectDelay);
  }

  function setConnectionStatus(connected) {
    const dot = $('.status-dot');
    const label = $('.status-label');
    if (dot) dot.classList.toggle('connected', connected);
    if (label) label.textContent = connected ? 'Connected' : 'Reconnecting...';
  }

  // --- Render ---
  function renderAll() {
    if (!state) return;

    renderSession();
    renderCost();
    renderContext();
    renderTokens();
    renderLatency();
    renderModels();
    renderTools();
    renderSubagentSummary();
    renderAgents();
    renderAgentActivity();
    renderSubagentLedger();
    renderStreaming();
    renderErrors();
    renderRequestLog();
  }

  function renderSession() {
    setText('#session-messages', state.session.messages);
    setText('#session-duration', formatElapsed(state.session.startTime));

    // Update elapsed timer
    if (elapsedTimer) clearInterval(elapsedTimer);
    if (state.session.startTime) {
      elapsedTimer = setInterval(() => {
        setText('#session-duration', formatElapsed(state.session.startTime));
      }, 1000);
    }
  }

  function renderCost() {
    setText('#cost-current', formatCost(state.cost.current));
    setText('#cost-total', formatCost(state.cost.total));
  }

  function renderContext() {
    const canvas = $('#gauge-canvas');
    if (canvas) drawGauge(canvas, state.context.percent);
    setText('#context-tokens', formatTokens(state.context.used) + ' / 200K');
  }

  function renderTokens() {
    setText('#tokens-input', formatTokens(state.tokens.input));
    setText('#tokens-output', formatTokens(state.tokens.output));
    setText('#tokens-cache-read', formatTokens(state.tokens.cacheRead));
    setText('#tokens-cache-write', formatTokens(state.tokens.cacheWrite));
  }

  function renderLatency() {
    setText('#latency-duration', formatDuration(state.latency.lastDurationMs));
    setText('#latency-ttft', formatDuration(state.latency.lastTtftMs));

    const canvas = $('#sparkline-canvas');
    if (canvas && state.latency.history.length > 0) {
      drawSparkline(canvas, state.latency.history, '#58a6ff');
    }
  }

  function renderModels() {
    const container = $('#model-list');
    if (!container) return;

    const entries = Object.entries(state.models);
    const total = entries.reduce((s, [, v]) => s + v, 0);

    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state">No data yet</div>';
    } else {
      container.innerHTML = entries
        .sort((a, b) => b[1] - a[1])
        .map(([model, count]) => {
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
          const color = MODEL_COLORS[model] || COLORS.muted;
          return `<div class="model-row">
            <span class="model-dot" style="background:${color}"></span>
            <span class="model-name">${formatModel(model)}</span>
            <span class="model-pct">${pct}%</span>
          </div>`;
        })
        .join('');
    }

    const donutCanvas = $('#donut-canvas');
    if (donutCanvas) drawDonut(donutCanvas, state.models);
  }

  function renderTools() {
    const container = $('#tool-list');
    if (!container) return;

    const entries = Object.entries(state.tools);
    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state">No tool usage yet</div>';
      return;
    }

    container.innerHTML = entries
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 10)
      .map(([name, data]) => {
        const avg = data.calls > 0 && data.totalMs > 0
          ? formatDuration(data.totalMs / data.calls)
          : '--';
        return `<div class="tool-row">
          <span class="tool-name">${name}</span>
          <span class="tool-stat">${data.calls} calls</span>
          <span class="tool-stat">(avg ${avg})</span>
        </div>`;
      })
      .join('');
  }

  function renderSubagentSummary() {
    const summary = state.subagents || {};
    setText('#subagents-total', summary.totalAgents || 0);
    setText('#subagents-active', summary.activeAgents || 0);
    setText('#subagents-requests', summary.totalRequests || 0);
    setText('#subagents-cost', formatCost(summary.totalCost || 0));
  }

  function renderStreaming() {
    setText('#streaming-stalls', state.streaming.stalls);
    setText('#streaming-total', formatDuration(state.streaming.totalStallMs));
  }

  function renderAgents() {
    const container = $('#agent-list');
    if (!container) return;

    const entries = Object.entries(state.agents || {});
    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state">No agent calls yet</div>';
      return;
    }

    container.innerHTML = entries
      .sort((a, b) => (b[1].cost || 0) - (a[1].cost || 0) || (b[1].requestCount || 0) - (a[1].requestCount || 0))
      .slice(0, 10)
      .map(([name, data]) => {
        const avg = data.toolCalls > 0 && data.totalToolMs > 0
          ? formatDuration(data.totalToolMs / data.toolCalls)
          : '--';
        const tokenTotal = totalAgentTokens(data);
        const status = data.status || 'idle';
        return `<article class="agent-card">
          <div class="agent-card-head">
            <div class="agent-card-head-main">
              <span class="agent-card-name">${escapeHtml(name)}</span>
              <span class="scope-badge scope-badge-subagent">subagent</span>
            </div>
            <span class="agent-status agent-status-${status}">${escapeHtml(status)}</span>
          </div>
          <div class="agent-card-metrics">
            <span>${data.calls || 0} runs</span>
            <span>${data.requestCount || 0} req</span>
            <span>${data.toolCalls || 0} tools</span>
          </div>
          <div class="agent-card-metrics">
            <span>${formatTokens(tokenTotal)}</span>
            <span>${formatCost(data.cost || 0)}</span>
            <span>avg tool ${avg}</span>
          </div>
        </article>`;
      })
      .join('');
  }

  function renderAgentActivity() {
    const container = $('#agent-activity-list');
    if (!container) return;

    const rows = state.agentActivity || [];
    if (rows.length === 0) {
      container.innerHTML = '<div class="empty-state">No agent activity yet</div>';
      return;
    }

    const grouped = {
      analysis: [],
      planning: [],
      solutioning: [],
      implementation: [],
      deployment: [],
    };

    rows.slice(0, 40).forEach((r) => {
      const lane = classifyActivityLane(r);
      grouped[lane].push(r);
    });

    container.innerHTML = `<div class="activity-board">${ACTIVITY_COLUMNS.map((col) => {
      const items = grouped[col.key].slice(0, 8);
      return `<section class="activity-column activity-column-${col.key}">
        <header class="activity-column-head">
          <span class="activity-column-title">${col.label}</span>
          <span class="activity-column-count">${grouped[col.key].length}</span>
        </header>
        <div class="activity-column-body">
          ${items.length === 0
            ? '<div class="activity-empty">No items</div>'
            : items.map((r) => `<article class="activity-card">
                <div class="activity-card-top">
                  <span class="activity-card-agent">${escapeHtml(r.agent || 'unknown')}</span>
                  <span class="activity-card-time">${formatTimestamp(r.timestamp)}</span>
                </div>
                <div class="activity-card-text">${escapeHtml(`did ${r.action}: ${r.detail}`)}</div>
              </article>`).join('')}
        </div>
      </section>`;
    }).join('')}</div>`;
  }

  function classifyActivityLane(activity) {
    const text = `${activity.agent || ''} ${activity.action || ''} ${activity.detail || ''}`.toLowerCase();
    for (const col of ACTIVITY_COLUMNS) {
      if (col.keywords.some((kw) => text.includes(kw))) {
        return col.key;
      }
    }
    return 'implementation';
  }

  function renderSubagentLedger() {
    const tbody = $('#subagent-body');
    if (!tbody) return;

    const entries = Object.entries(state.agents || {});
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No subagent data yet</td></tr>';
      return;
    }

    tbody.innerHTML = entries
      .sort((a, b) => (b[1].cost || 0) - (a[1].cost || 0) || totalAgentTokens(b[1]) - totalAgentTokens(a[1]))
      .map(([name, data]) => `<tr>
        <td>${escapeHtml(name)}</td>
        <td><span class="agent-status agent-status-${escapeHtml(data.status || 'idle')}">${escapeHtml(data.status || 'idle')}</span></td>
        <td>${data.calls || 0}</td>
        <td>${data.requestCount || 0}</td>
        <td>${data.toolCalls || 0}</td>
        <td>${formatTokens(data.tokens && data.tokens.input || 0)}</td>
        <td>${formatTokens(data.tokens && data.tokens.output || 0)}</td>
        <td>${formatTokens((data.tokens && data.tokens.cacheRead || 0) + (data.tokens && data.tokens.cacheWrite || 0))}</td>
        <td>${formatCost(data.cost || 0)}</td>
        <td>${data.lastSeen ? formatTimestamp(data.lastSeen) : '--'}</td>
      </tr>`)
      .join('');
  }

  function totalAgentTokens(agent) {
    if (!agent || !agent.tokens) return 0;
    return (agent.tokens.input || 0) + (agent.tokens.output || 0) + (agent.tokens.cacheRead || 0) + (agent.tokens.cacheWrite || 0);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderErrors() {
    setText('#error-count', state.errors.count);
    if (state.errors.last) {
      setText('#error-last', `${state.errors.last.type}: ${state.errors.last.message}`);
    } else {
      setText('#error-last', '(none)');
    }
  }

  function renderRequestLog() {
    const tbody = $('#log-body');
    if (!tbody) return;

    if (!state.requestLog || state.requestLog.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No requests yet</td></tr>';
      return;
    }

    tbody.innerHTML = state.requestLog
      .slice(0, 50)
      .map((r) => `<tr>
        <td>${formatTimestamp(r.timestamp)}</td>
        <td><span class="scope-badge ${r.isSubagent ? 'scope-badge-subagent' : 'scope-badge-root'}">${r.isSubagent ? 'subagent' : 'root'}</span></td>
        <td>${formatModel(r.model)}</td>
        <td>${formatTokens(r.inputTokens)}</td>
        <td>${formatTokens(r.outputTokens)}</td>
        <td>${formatTokens(r.cacheRead)}</td>
        <td>${formatCost(r.cost)}</td>
        <td>${formatDuration(r.durationMs)}</td>
        <td>${formatStopReason(r.stopReason)}</td>
      </tr>`)
      .join('');
  }

  // --- Helpers ---
  function setText(sel, text) {
    const el = $(sel);
    if (el) {
      const val = String(text);
      if (el.textContent !== val) {
        el.textContent = val;
        el.classList.add('updating');
        setTimeout(() => el.classList.remove('updating'), 500);
      }
    }
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    connect();

    // Handle canvas resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state) renderAll();
      }, 200);
    });
  });
})();
