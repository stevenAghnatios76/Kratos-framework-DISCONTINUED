import { Database } from 'sql.js';
export interface MemoryEntry {
    id?: number;
    partition: 'decisions' | 'patterns' | 'facts' | 'context' | 'anti-patterns' | 'trajectories';
    agent_id: string;
    access_level: 'agent-private' | 'team-shared' | 'global';
    title: string;
    content: string;
    tags: string[];
    metadata: Record<string, unknown>;
    score: number;
    use_count?: number;
    last_used_at?: string;
    status: 'active' | 'stale' | 'contradicted' | 'archived';
    ttl_days: number;
    created_at?: string;
    updated_at?: string;
    expires_at?: string;
    source_workflow?: string;
    source_story?: string;
    source_session?: string;
}
export declare class MemoryManager {
    private db;
    private dbPath;
    constructor(dbPath: string);
    init(): Promise<void>;
    private save;
    private getDb;
    store(entry: MemoryEntry): Promise<number>;
    get(id: number): Promise<MemoryEntry | null>;
    update(id: number, changes: Partial<MemoryEntry>): Promise<void>;
    delete(id: number): Promise<void>;
    query(opts: {
        partition?: string;
        agent_id?: string;
        access_level?: string;
        status?: string;
        tags?: string[];
        limit?: number;
        offset?: number;
        order_by?: 'score' | 'created_at' | 'last_used_at';
    }): Promise<MemoryEntry[]>;
    search(query: string, opts?: {
        partition?: string;
        agent_id?: string;
        limit?: number;
    }): Promise<MemoryEntry[]>;
    getAgentMemory(agent_id: string): Promise<MemoryEntry[]>;
    storeDecision(agent_id: string, title: string, content: string, opts?: Partial<MemoryEntry>): Promise<number>;
    storeFact(agent_id: string, title: string, content: string): Promise<number>;
    storePattern(agent_id: string, title: string, content: string, score: number): Promise<number>;
    storeAntiPattern(agent_id: string, title: string, content: string): Promise<number>;
    expireStaleEntries(): Promise<number>;
    evictLRU(partition: string, maxEntries: number): Promise<number>;
    markStale(id: number): Promise<void>;
    markContradicted(id: number, reason: string): Promise<void>;
    exportAgentSidecar(agent_id: string): Promise<string>;
    exportAllSidecars(outputDir: string): Promise<void>;
    getStats(): Promise<{
        total_entries: number;
        by_partition: Record<string, number>;
        by_agent: Record<string, number>;
        stale_count: number;
        expired_count: number;
    }>;
    /**
     * Flush pending changes to disk. Used by BudgetTracker and other modules
     * that write directly to the database via getDatabase().
     */
    flush(): void;
    getDatabase(): Database;
    close(): Promise<void>;
    private rowToEntry;
}
