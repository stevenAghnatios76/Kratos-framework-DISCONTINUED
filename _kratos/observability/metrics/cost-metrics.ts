// Kratos Cost Metrics
// Cost per story/sprint, tier distribution, savings, and forecast.
// Reuses BudgetTracker spend data already in the metrics table.

import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
import { MetricsCollector } from './collector.js';

interface CostBreakdown {
  total_cost: number;
  by_tier: Record<string, number>;
  by_workflow: Record<string, number>;
  by_provider: Record<string, number>;
  request_count: number;
}

interface StoryCost {
  story_key: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface CostReport {
  period: string;
  breakdown: CostBreakdown;
  per_story: StoryCost[];
  avg_cost_per_story: number;
  forecast_monthly: number;
  savings_vs_opus: number;
  savings_pct: number;
  tier_distribution: Record<string, number>;
}

export class CostMetrics {
  private manager: MemoryManager;
  private collector: MetricsCollector;

  constructor(manager: MemoryManager) {
    this.manager = manager;
    this.collector = new MetricsCollector(manager);
  }

  /**
   * Calculate cost metrics for a given period.
   */
  calculate(period: 'today' | 'week' | 'month' | 'all' = 'month'): CostReport {
    const db = this.manager.getDatabase();
    const dateFilter = periodToDateFilter(period);

    // Total cost breakdown
    const totalResult = db.exec(
      `SELECT COALESCE(SUM(value), 0), COUNT(*) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}`
    );
    const total_cost = (totalResult[0]?.values[0]?.[0] as number) || 0;
    const request_count = (totalResult[0]?.values[0]?.[1] as number) || 0;

    // By provider
    const by_provider = this.groupBy('provider', dateFilter, db);
    const by_workflow = this.groupBy('workflow', dateFilter, db);
    const by_tier = this.groupBy('model', dateFilter, db);

    const breakdown: CostBreakdown = {
      total_cost, by_tier, by_workflow, by_provider, request_count,
    };

    // Per-story costs
    const storyResult = db.exec(
      `SELECT json_extract(dimensions, '$.workflow') as wf,
              SUM(value) as cost,
              SUM(COALESCE(json_extract(dimensions, '$.input_tokens'), 0) +
                  COALESCE(json_extract(dimensions, '$.output_tokens'), 0)) as tokens,
              COUNT(*) as reqs
       FROM metrics WHERE metric_type = 'cost' ${dateFilter}
       AND json_extract(dimensions, '$.workflow') IS NOT NULL
       GROUP BY wf ORDER BY cost DESC`
    );
    const per_story: StoryCost[] = [];
    if (storyResult.length) {
      for (const row of storyResult[0].values) {
        per_story.push({
          story_key: row[0] as string,
          cost: row[1] as number,
          tokens: row[2] as number,
          requests: row[3] as number,
        });
      }
    }

    const avg_cost_per_story = per_story.length > 0
      ? total_cost / per_story.length : 0;

    // Forecast: project monthly cost from daily average
    const daysInPeriod = period === 'today' ? 1 : period === 'week' ? 7 : 30;
    const dailyAvg = daysInPeriod > 0 ? total_cost / daysInPeriod : 0;
    const forecast_monthly = dailyAvg * 30;

    // Savings vs Opus baseline
    const tokenResult = db.exec(
      `SELECT COALESCE(SUM(json_extract(dimensions, '$.input_tokens')), 0),
              COALESCE(SUM(json_extract(dimensions, '$.output_tokens')), 0)
       FROM metrics WHERE metric_type = 'cost' ${dateFilter}`
    );
    const totalInput = (tokenResult[0]?.values[0]?.[0] as number) || 0;
    const totalOutput = (tokenResult[0]?.values[0]?.[1] as number) || 0;
    const opusBaseline = (totalInput / 1000) * 0.015 + (totalOutput / 1000) * 0.075;
    const savings_vs_opus = opusBaseline - total_cost;
    const savings_pct = opusBaseline > 0 ? (savings_vs_opus / opusBaseline) * 100 : 0;

    // Tier distribution as percentages
    const tier_distribution: Record<string, number> = {};
    for (const [tier, cost] of Object.entries(by_tier)) {
      tier_distribution[tier] = total_cost > 0 ? cost / total_cost : 0;
    }

    return {
      period,
      breakdown,
      per_story,
      avg_cost_per_story,
      forecast_monthly,
      savings_vs_opus,
      savings_pct,
      tier_distribution,
    };
  }

  /**
   * Record cost metrics snapshot.
   */
  recordMetrics(report: CostReport): void {
    this.collector.recordBatch([
      { metric_type: 'cost', metric_name: 'total_cost', value: report.breakdown.total_cost, unit: 'usd', dimensions: { period: report.period } },
      { metric_type: 'cost', metric_name: 'forecast_monthly', value: report.forecast_monthly, unit: 'usd' },
      { metric_type: 'cost', metric_name: 'savings_pct', value: report.savings_pct, unit: 'percent' },
    ]);
  }

  /**
   * Format cost report for console display.
   */
  formatReport(report: CostReport): string {
    const lines: string[] = [
      `Cost Report (${report.period})`,
      '='.repeat(50),
      '',
      `Total cost:           $${report.breakdown.total_cost.toFixed(4)}`,
      `Requests:             ${report.breakdown.request_count}`,
      `Avg cost/story:       $${report.avg_cost_per_story.toFixed(4)}`,
      `Monthly forecast:     $${report.forecast_monthly.toFixed(2)}`,
      `Savings vs Opus:      $${report.savings_vs_opus.toFixed(4)} (${report.savings_pct.toFixed(1)}%)`,
      '',
    ];

    if (Object.keys(report.breakdown.by_provider).length > 0) {
      lines.push('By Provider:');
      for (const [p, c] of Object.entries(report.breakdown.by_provider)) {
        lines.push(`  ${p}: $${c.toFixed(4)}`);
      }
      lines.push('');
    }

    if (Object.keys(report.tier_distribution).length > 0) {
      lines.push('Tier Distribution:');
      for (const [tier, pct] of Object.entries(report.tier_distribution)) {
        lines.push(`  ${tier}: ${(pct * 100).toFixed(1)}%`);
      }
      lines.push('');
    }

    if (report.per_story.length > 0) {
      lines.push('Top Workflows by Cost:');
      for (const s of report.per_story.slice(0, 10)) {
        lines.push(`  ${s.story_key}: $${s.cost.toFixed(4)} (${s.tokens.toLocaleString()} tokens)`);
      }
    }

    return lines.join('\n');
  }

  private groupBy(dim: string, dateFilter: string, db: ReturnType<MemoryManager['getDatabase']>): Record<string, number> {
    const result = db.exec(
      `SELECT json_extract(dimensions, '$.${dim}'), SUM(value) FROM metrics
       WHERE metric_type = 'cost' ${dateFilter}
       GROUP BY json_extract(dimensions, '$.${dim}')`
    );
    const map: Record<string, number> = {};
    if (result.length) {
      for (const row of result[0].values) {
        const key = row[0] as string;
        if (key) map[key] = row[1] as number;
      }
    }
    return map;
  }
}

function periodToDateFilter(period: string): string {
  switch (period) {
    case 'today': return "AND date(recorded_at) = date('now')";
    case 'week': return "AND recorded_at >= datetime('now', '-7 days')";
    case 'month': return "AND recorded_at >= datetime('now', '-30 days')";
    default: return '';
  }
}
