import { MemoryManager, MemoryEntry } from './memory-manager';
export interface SearchOptions {
    partition?: string;
    agent_id?: string;
    access_level?: string;
    tags?: string[];
    limit?: number;
    min_score?: number;
}
export declare class MemorySearch {
    private manager;
    constructor(manager: MemoryManager);
    fullTextSearch(query: string, opts?: SearchOptions): Promise<MemoryEntry[]>;
    findSimilar(entryId: number, limit?: number): Promise<MemoryEntry[]>;
    findByTags(tags: string[], opts?: {
        partition?: string;
        limit?: number;
    }): Promise<MemoryEntry[]>;
    findContradictions(agent_id: string): Promise<{
        entry: MemoryEntry;
        contradicts: MemoryEntry;
    }[]>;
    private extractKeywords;
    private calculateOverlap;
}
