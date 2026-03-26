import { MemoryManager, MemoryEntry } from '../memory/memory-manager';
import { Trajectory } from './trajectory-recorder';
export declare class ReasoningBank {
    private db;
    private recorder;
    constructor(db: MemoryManager);
    retrievePatterns(opts: {
        agent_id: string;
        workflow: string;
        context_keywords: string[];
        limit?: number;
    }): Promise<{
        patterns: MemoryEntry[];
        anti_patterns: MemoryEntry[];
        similar_trajectories: Trajectory[];
    }>;
    formatForPrompt(patterns: MemoryEntry[], antiPatterns: MemoryEntry[]): Promise<string>;
    markUsed(entryId: number): Promise<void>;
    private searchPartition;
    private findSimilarTrajectories;
}
