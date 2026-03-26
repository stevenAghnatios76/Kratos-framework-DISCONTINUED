import type { MemoryManager } from '../memory/memory-manager';
export interface GroundTruthFact {
    category: 'file' | 'dependency' | 'config' | 'structure';
    key: string;
    value: string;
    source: string;
}
export declare class GroundTruth {
    private manager;
    private projectRoot;
    private lastRefresh;
    constructor(manager: MemoryManager, projectRoot: string);
    /**
     * Refresh ground truth by scanning filesystem and package.json.
     */
    refresh(): Promise<{
        facts_stored: number;
        categories: Record<string, number>;
    }>;
    /**
     * Query ground truth facts.
     */
    getFacts(category?: string): Promise<GroundTruthFact[]>;
    /**
     * Check if a specific file exists in ground truth.
     */
    fileExists(filePath: string): Promise<boolean>;
    /**
     * Check if a dependency exists in ground truth.
     */
    dependencyExists(name: string): Promise<{
        exists: boolean;
        version?: string;
        type?: string;
    }>;
    /**
     * Get last refresh timestamp.
     */
    getLastRefresh(): Date | null;
    private scanDirectory;
}
