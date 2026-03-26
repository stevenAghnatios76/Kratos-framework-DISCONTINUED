import { MemoryManager } from '../memory/memory-manager';
export interface DistilledPattern {
    title: string;
    description: string;
    conditions: string[];
    approach: string;
    avg_score: number;
    frequency: number;
    source_trajectories: number[];
}
export declare class PatternDistiller {
    private db;
    private recorder;
    constructor(db: MemoryManager);
    distill(opts?: {
        agent_id?: string;
        min_trajectories?: number;
        min_score?: number;
    }): Promise<DistilledPattern[]>;
    storePattern(pattern: DistilledPattern): Promise<number>;
    storeAntiPattern(pattern: DistilledPattern): Promise<number>;
    runDistillationCycle(): Promise<{
        patterns_created: number;
        anti_patterns_created: number;
        trajectories_analyzed: number;
    }>;
    private clusterByApproach;
    private normalizeApproach;
    private extractPattern;
    private extractAntiPattern;
    private formatPatternContent;
}
