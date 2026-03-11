/* Formatting utilities for dashboard values */

function formatTokens(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return n.toLocaleString();
}

function formatCost(usd) {
  if (usd == null || isNaN(usd)) return '$0.00';
  if (usd < 0.01 && usd > 0) return '$' + usd.toFixed(4);
  return '$' + usd.toFixed(2);
}

function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return '0ms';
  if (ms < 1000) return Math.round(ms) + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return mins + 'm ' + secs + 's';
}

function formatTimestamp(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatElapsed(startTime) {
  if (!startTime) return '--';
  const start = new Date(startTime).getTime();
  const elapsed = Date.now() - start;
  if (isNaN(elapsed) || elapsed < 0) return '--';
  if (elapsed < 60000) return Math.floor(elapsed / 1000) + 's';
  if (elapsed < 3600000) return Math.floor(elapsed / 60000) + 'm';
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  return h + 'h ' + m + 'm';
}

function formatPercent(pct) {
  if (pct == null || isNaN(pct)) return '0%';
  return pct.toFixed(1) + '%';
}

function formatModel(model) {
  if (!model) return 'unknown';
  return model
    .replace('claude-', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatStopReason(reason) {
  if (!reason) return '--';
  return reason.replace(/_/g, ' ');
}
