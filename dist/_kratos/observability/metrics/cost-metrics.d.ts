import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
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
export declare class CostMetrics {
    private manager;
    private collector;
    constructor(manager: MemoryManager);
    /**
     * Calculate cost metrics for a given period.
     */
    calculate(period?: 'today' | 'week' | 'month' | 'all'): CostReport;
    /**
     * Record cost metrics snapshot.
     */
    recordMetrics(report: CostReport): void;
    /**
     * Format cost report for console display.
     */
    formatReport(report: CostReport): string;
    private groupBy;
}
export {};
