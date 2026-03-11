'use strict';

/**
 * Parse ~/.claude/stats-cache.json for historical aggregates.
 */
function parseStatsCache(content) {
  let data;
  try {
    data = JSON.parse(content);
  } catch {
    return { daily: [], totals: null };
  }

  const daily = [];
  const totals = {
    totalTokens: 0,
    totalCost: 0,
    totalMessages: 0,
    totalSessions: 0,
  };

  // stats-cache.json typically has daily buckets
  if (data.daily || data.days) {
    const days = data.daily || data.days || {};
    for (const [date, stats] of Object.entries(days)) {
      const entry = {
        date,
        inputTokens: stats.input_tokens || stats.inputTokens || 0,
        outputTokens: stats.output_tokens || stats.outputTokens || 0,
        cacheRead: stats.cache_read_input_tokens || stats.cacheRead || 0,
        cacheWrite: stats.cache_creation_input_tokens || stats.cacheWrite || 0,
        cost: stats.cost_usd || stats.cost || stats.costUSD || 0,
        messages: stats.messages || stats.message_count || 0,
        sessions: stats.sessions || stats.session_count || 0,
      };
      daily.push(entry);
      totals.totalTokens += entry.inputTokens + entry.outputTokens + entry.cacheRead + entry.cacheWrite;
      totals.totalCost += entry.cost;
      totals.totalMessages += entry.messages;
      totals.totalSessions += entry.sessions;
    }
  }

  // Some formats store totals at the top level
  if (data.totalCost || data.total_cost) {
    totals.totalCost = data.totalCost || data.total_cost || totals.totalCost;
  }
  if (data.totalTokens || data.total_tokens) {
    totals.totalTokens = data.totalTokens || data.total_tokens || totals.totalTokens;
  }

  // Sort daily by date descending
  daily.sort((a, b) => b.date.localeCompare(a.date));

  return { daily, totals };
}

module.exports = { parseStatsCache };
