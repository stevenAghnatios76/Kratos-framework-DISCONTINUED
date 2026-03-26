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
export declare class BudgetTracker {
    private manager;
    constructor(manager: MemoryManager);
    /**
     * Record a spend event.
     */
    recordSpend(record: SpendRecord): Promise<void>;
    /**
     * Get total spend for today.
     */
    getDailySpend(): Promise<number>;
    /**
     * Get spend report for a period.
     */
    getSpend(period: 'today' | 'week' | 'month' | 'all'): Promise<SpendReport>;
    /**
     * Check if spend is within budget.
     */
    checkBudget(dailyLimit: number): Promise<{
        within_budget: boolean;
        spent: number;
        remaining: number;
    }>;
    /**
     * Format a spend report for display.
     */
    formatReport(report: SpendReport): string;
    /**
     * Calculate savings vs all-Opus baseline.
     */
    calculateSavings(period: 'today' | 'week' | 'month' | 'all'): Promise<{
        actual_cost: number;
        opus_baseline: number;
        savings: number;
        savings_pct: number;
    }>;
    private periodToDateFilter;
}
export {};
