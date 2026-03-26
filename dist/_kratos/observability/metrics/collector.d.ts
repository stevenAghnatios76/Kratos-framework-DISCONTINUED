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
    from?: string;
    to?: string;
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
export declare class MetricsCollector {
    private manager;
    constructor(manager: MemoryManager);
    /**
     * Record a single metric.
     */
    record(metric: MetricRecord): void;
    /**
     * Record multiple metrics in a single transaction.
     */
    recordBatch(metrics: MetricRecord[]): void;
    /**
     * Query metrics with optional filters.
     */
    query(opts: MetricQuery): MetricRow[];
    /**
     * Aggregate a metric over a period.
     */
    aggregate(metric_type: string, metric_name: string, fn: 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT', dateFilter?: string): number;
    /**
     * Get latest value for a metric.
     */
    latest(metric_type: string, metric_name: string): MetricRow | null;
    /**
     * Delete metrics older than a given number of days.
     */
    prune(olderThanDays: number): number;
    /**
     * Export all metrics as JSON for the dashboard.
     */
    exportJson(opts?: MetricQuery): object[];
    private rowToMetric;
}
