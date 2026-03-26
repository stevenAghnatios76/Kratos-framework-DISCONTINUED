import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
export interface SprintReport {
    sprint_id: string;
    velocity: number;
    planned_points: number;
    completed_points: number;
    completion_rate: number;
    avg_cycle_time_days: number;
    throughput: number;
    burndown: {
        date: string;
        remaining: number;
    }[];
    health_score: number;
    stories_by_status: Record<string, number>;
}
export declare class SprintMetrics {
    private collector;
    constructor(manager: MemoryManager);
    /**
     * Calculate sprint metrics from sprint-status.yaml.
     */
    calculate(statusPath: string): SprintReport;
    /**
     * Record sprint metrics to the metrics table.
     */
    recordMetrics(report: SprintReport): void;
    /**
     * Format sprint report for console display.
     */
    formatReport(report: SprintReport): string;
    private buildBurndown;
    private calculateHealthScore;
}
