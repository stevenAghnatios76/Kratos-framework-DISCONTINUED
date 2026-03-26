import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
interface ReviewGateResult {
    gate: string;
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
}
export interface QualityReport {
    first_pass_rate: number;
    gate_results: ReviewGateResult[];
    overall_gate_pass_rate: number;
    quality_score: number;
    stories_reviewed: number;
    stories_passed_first: number;
}
export declare class QualityMetrics {
    private manager;
    private collector;
    constructor(manager: MemoryManager);
    /**
     * Calculate quality metrics from trajectory scores and review gate data.
     */
    calculate(): QualityReport;
    /**
     * Record quality metrics.
     */
    recordMetrics(report: QualityReport): void;
    /**
     * Format quality report for console display.
     */
    formatReport(report: QualityReport): string;
}
export {};
