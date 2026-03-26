// Kratos Budget Tracker
// Tracks LLM spend using the existing metrics table in memory.db.

import type { MemoryManager } from '../intelligence/memory/memory-manager';

interface SpendRecord {
  provider: string;
  model: string;
  workflow: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  timestamp: string;
}

interface SpendReport {
  period: string;
  total_cost: number;
  by_provider: Record<string, number>;
  by_workflow: Record<string, number>;
  by_tier: Record<string, number>;
  request_count: number;
}

export class BudgetTracker {
  private manager: MemoryManager;

  constructor(manager: MemoryManager) {
    this.manager = manager;
  }

  /**
   * Record a spend event.
   */
  async recordSpend(record: SpendRecord): Promise<void> {
    const db = this.manager.getDatabase();
    db.run(
      `INSERT INTO metrics (metric_type, metric_name, metric_value, dimensions, recorded_at)
       VALUES ('cost', 'llm_spend', ?, ?, datetime('now'))`,
      [
        record.cost,
        JSON.stringify({
          provider: record.provider,
          model: record.model,
          workflow: record.workflow,
          input_tokens: record.input_tokens,
          output_tokens: record.output_tokens,
        }),
      ]
    );
    this.manager.flush();
  }

  /**
   * Get total spend for today.
   */
  async getDailySpend(): Promise<number> {
    const db = this.manager.getDatabase();
    const result = db.exec(
      `SELECT COALESCE(SUM(metric_value), 0) FROM metrics
       WHERE metric_type = 'cost' AND date(recorded_at) = date('now')`
    );
    return (result[0]?.values[0]?.[0] as number) || 0;
  }

  /**
   * Get spend report for a period.
   */
  async getSpend(period: 'today' | 'week' | 'month' | 'all'): Promise<SpendReport> {
    const db = this.manager.getDatabase();
    const dateFilter = this.periodToDateFilter(period);

    // Total cost
    const totalResult = db.exec(
      `SELECT COALESCE(SUM(metric_value), 0), COUNT(*) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}`
    );
    const total_cost = (totalResult[0]?.values[0]?.[0] as number) || 0;
    const request_count = (totalResult[0]?.values[0]?.[1] as number) || 0;

    // By provider
    const byProviderResult = db.exec(
      `SELECT json_extract(dimensions, '$.provider'), SUM(metric_value) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}
       GROUP BY json_extract(dimensions, '$.provider')`
    );
    const by_provider: Record<string, number> = {};
    if (byProviderResult.length) {
      for (const row of byProviderResult[0].values) {
        by_provider[row[0] as string] = row[1] as number;
      }
    }

    // By workflow
    const byWorkflowResult = db.exec(
      `SELECT json_extract(dimensions, '$.workflow'), SUM(metric_value) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}
       GROUP BY json_extract(dimensions, '$.workflow')`
    );
    const by_workflow: Record<string, number> = {};
    if (byWorkflowResult.length) {
      for (const row of byWorkflowResult[0].values) {
        by_workflow[row[0] as string] = row[1] as number;
      }
    }

    // By model (as tier proxy)
    const byModelResult = db.exec(
      `SELECT json_extract(dimensions, '$.model'), SUM(metric_value) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}
       GROUP BY json_extract(dimensions, '$.model')`
    );
    const by_tier: Record<string, number> = {};
    if (byModelResult.length) {
      for (const row of byModelResult[0].values) {
        by_tier[row[0] as string] = row[1] as number;
      }
    }

    return { period, total_cost, by_provider, by_workflow, by_tier, request_count };
  }

  /**
   * Check if spend is within budget.
   */
  async checkBudget(dailyLimit: number): Promise<{ within_budget: boolean; spent: number; remaining: number }> {
    const spent = await this.getDailySpend();
    return {
      within_budget: spent <= dailyLimit,
      spent,
      remaining: Math.max(0, dailyLimit - spent),
    };
  }

  /**
   * Format a spend report for display.
   */
  formatReport(report: SpendReport): string {
    const lines: string[] = [
      `Cost Report (${report.period})`,
      `${'='.repeat(40)}`,
      `Total cost:     $${report.total_cost.toFixed(4)}`,
      `Total requests: ${report.request_count}`,
      '',
    ];

    if (Object.keys(report.by_provider).length > 0) {
      lines.push('By Provider:');
      for (const [provider, cost] of Object.entries(report.by_provider)) {
        lines.push(`  ${provider}: $${cost.toFixed(4)}`);
      }
      lines.push('');
    }

    if (Object.keys(report.by_workflow).length > 0) {
      lines.push('By Workflow:');
      const sorted = Object.entries(report.by_workflow).sort((a, b) => b[1] - a[1]);
      for (const [workflow, cost] of sorted.slice(0, 10)) {
        lines.push(`  ${workflow}: $${cost.toFixed(4)}`);
      }
      lines.push('');
    }

    if (Object.keys(report.by_tier).length > 0) {
      lines.push('By Model:');
      for (const [model, cost] of Object.entries(report.by_tier)) {
        lines.push(`  ${model}: $${cost.toFixed(4)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Calculate savings vs all-Opus baseline.
   */
  async calculateSavings(period: 'today' | 'week' | 'month' | 'all'): Promise<{
    actual_cost: number;
    opus_baseline: number;
    savings: number;
    savings_pct: number;
  }> {
    const db = this.manager.getDatabase();
    const dateFilter = this.periodToDateFilter(period);

    // Actual cost
    const actualResult = db.exec(
      `SELECT COALESCE(SUM(metric_value), 0) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}`
    );
    const actual_cost = (actualResult[0]?.values[0]?.[0] as number) || 0;

    // Calculate Opus baseline from token counts
    const tokensResult = db.exec(
      `SELECT
         COALESCE(SUM(json_extract(dimensions, '$.input_tokens')), 0),
         COALESCE(SUM(json_extract(dimensions, '$.output_tokens')), 0)
       FROM metrics WHERE metric_type = 'cost' ${dateFilter}`
    );
    const totalInput = (tokensResult[0]?.values[0]?.[0] as number) || 0;
    const totalOutput = (tokensResult[0]?.values[0]?.[1] as number) || 0;

    // Opus pricing: $0.015/1k input, $0.075/1k output
    const opus_baseline = (totalInput / 1000) * 0.015 + (totalOutput / 1000) * 0.075;
    const savings = opus_baseline - actual_cost;
    const savings_pct = opus_baseline > 0 ? (savings / opus_baseline) * 100 : 0;

    return { actual_cost, opus_baseline, savings, savings_pct };
  }

  private periodToDateFilter(period: string): string {
    switch (period) {
      case 'today': return "AND date(recorded_at) = date('now')";
      case 'week': return "AND recorded_at >= datetime('now', '-7 days')";
      case 'month': return "AND recorded_at >= datetime('now', '-30 days')";
      default: return '';
    }
  }
}
