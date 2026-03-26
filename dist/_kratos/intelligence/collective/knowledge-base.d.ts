import { MemoryManager, MemoryEntry } from '../memory/memory-manager';
export declare class CollectiveKnowledge {
    private db;
    constructor(db: MemoryManager);
    shareFact(publisherAgent: string, title: string, content: string, tags: string[]): Promise<number>;
    shareDecision(publisherAgent: string, title: string, content: string, tags: string[]): Promise<number>;
    sharePattern(publisherAgent: string, title: string, content: string, score: number): Promise<number>;
    shareAntiPattern(publisherAgent: string, title: string, content: string): Promise<number>;
    getSharedKnowledge(agentId: string, opts?: {
        partition?: string;
        tags?: string[];
        limit?: number;
    }): Promise<MemoryEntry[]>;
    getRelevantDecisions(agentId: string, limit?: number): Promise<MemoryEntry[]>;
}
