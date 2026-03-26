// Kratos Metrics Collector
// Central metrics collection using the memory.db metrics table.

import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';

export interface MetricRecord {
  metric_type: 'sprint' | 'agent' | 'cost' | 'quality';
  metric_name: string;
  value: number;
  unit?: string;
  dimensions?: Record<string, unknown>;
}

export interface MetricQuery {
  metric_type?: string;
  metric_name?: string;
  from?: string;       // ISO 8601
  to?: string;         // ISO 8601
  dimensions?: Record<string, unknown>;
  limit?: number;
}

export interface MetricRow {
  id: number;
  metric_type: string;
  metric_name: string;
  value: number;
  unit: string | null;
  dimensions: Record<string, unknown>;
  recorded_at: string;
}

export class MetricsCollector {
  private manager: MemoryManager;

  constructor(manager: MemoryManager) {
    this.manager = manager;
  }

  /**
   * Record a single metric.
   */
  record(metric: MetricRecord): void {
    const db = this.manager.getDatabase();
    db.run(
      `INSERT INTO metrics (metric_type, metric_name, value, unit, dimensions, recorded_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        metric.metric_type,
        metric.metric_name,
        metric.value,
        metric.unit || null,
        JSON.stringify(metric.dimensions || {}),
      ]
    );
    this.manager.flush();
  }

  /**
   * Record multiple metrics in a single transaction.
   */
  recordBatch(metrics: MetricRecord[]): void {
    const db = this.manager.getDatabase();
    db.run('BEGIN TRANSACTION');
    try {
      for (const metric of metrics) {
        db.run(
          `INSERT INTO metrics (metric_type, metric_name, value, unit, dimensions, recorded_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          [
            metric.metric_type,
            metric.metric_name,
            metric.value,
            metric.unit || null,
            JSON.stringify(metric.dimensions || {}),
          ]
        );
      }
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    this.manager.flush();
  }

  /**
   * Query metrics with optional filters.
   */
  query(opts: MetricQuery): MetricRow[] {
    const db = this.manager.getDatabase();
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (opts.metric_type) {
      conditions.push('metric_type = ?');
      values.push(opts.metric_type);
    }
    if (opts.metric_name) {
      conditions.push('metric_name = ?');
      values.push(opts.metric_name);
    }
    if (opts.from) {
      conditions.push('recorded_at >= ?');
      values.push(opts.from);
    }
    if (opts.to) {
      conditions.push('recorded_at <= ?');
      values.push(opts.to);
    }
    if (opts.dimensions) {
      for (const [key, val] of Object.entries(opts.dimensions)) {
        conditions.push(`json_extract(dimensions, '$.${key}') = ?`);
        values.push(val);
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = opts.limit || 1000;
    values.push(limit);

    const sql = `SELECT * FROM metrics ${where} ORDER BY recorded_at DESC LIMIT ?`;
    const result = db.exec(sql, values);
    if (!result.length) return [];

    return result[0].values.map((row: unknown[]) => this.rowToMetric(result[0].columns, row));
  }

  /**
   * Aggregate a metric over a period.
   */
  aggregate(
    metric_type: string,
    metric_name: string,
    fn: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT',
    dateFilter?: string
  ): number {
    const db = this.manager.getDatabase();
    const filter = dateFilter || '';
    const sql = `SELECT COALESCE(${fn}(value), 0) FROM metrics
                 WHERE metric_type = ? AND metric_name = ? ${filter}`;
    const result = db.exec(sql, [metric_type, metric_name]);
    return (result[0]?.values[0]?.[0] as number) || 0;
  }

  /**
   * Get latest value for a metric.
   */
  latest(metric_type: string, metric_name: string): MetricRow | null {
    const rows = this.query({ metric_type, metric_name, limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Delete metrics older than a given number of days.
   */
  prune(olderThanDays: number): number {
    const db = this.manager.getDatabase();
    const countResult = db.exec(
      `SELECT COUNT(*) FROM metrics WHERE recorded_at < datetime('now', '-${olderThanDays} days')`
    );
    const count = (countResult[0]?.values[0]?.[0] as number) || 0;
    if (count > 0) {
      db.run(`DELETE FROM metrics WHERE recorded_at < datetime('now', '-${olderThanDays} days')`);
      this.manager.flush();
    }
    return count;
  }

  /**
   * Export all metrics as JSON for the dashboard.
   */
  exportJson(opts?: MetricQuery): object[] {
    const rows = this.query(opts || {});
    return rows.map(r => ({
      metric_type: r.metric_type,
      metric_name: r.metric_name,
      value: r.value,
      unit: r.unit,
      dimensions: r.dimensions,
      recorded_at: r.recorded_at,
    }));
  }

  private rowToMetric(columns: string[], row: unknown[]): MetricRow {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return {
      id: obj.id as number,
      metric_type: obj.metric_type as string,
      metric_name: obj.metric_name as string,
      value: obj.value as number,
      unit: obj.unit as string | null,
      dimensions: JSON.parse((obj.dimensions as string) || '{}'),
      recorded_at: obj.recorded_at as string,
    };
  }
}
