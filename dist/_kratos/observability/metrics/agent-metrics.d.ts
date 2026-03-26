import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
interface AgentStat {
    agent_id: string;
    total_workflows: number;
    passed: number;
    failed: number;
    pass_rate: number;
    total_tokens: number;
    total_cost: number;
    patterns_learned: number;
    anti_patterns: number;
    avg_score: number;
}
export interface AgentReport {
    agents: AgentStat[];
    top_performer: string | null;
    total_workflows: number;
    overall_pass_rate: number;
}
export declare class AgentMetrics {
    private manager;
    private collector;
    constructor(manager: MemoryManager);
    /**
     * Compute per-agent statistics from trajectories and memory.
     */
    calculate(): AgentReport;
    /**
     * Record agent metrics snapshot.
     */
    recordMetrics(report: AgentReport): void;
    /**
     * Format agent report for console display.
     */
    formatReport(report: AgentReport): string;
}
export {};
