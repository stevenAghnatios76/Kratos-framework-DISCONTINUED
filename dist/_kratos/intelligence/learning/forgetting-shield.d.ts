import { MemoryManager } from '../memory/memory-manager';
export declare class ForgettingShield {
    private db;
    constructor(db: MemoryManager);
    protectHighValuePatterns(opts?: {
        min_score?: number;
        min_frequency?: number;
    }): Promise<number>;
    reviewProtections(): Promise<number>;
    runProtectionCycle(): Promise<{
        newly_protected: number;
        unprotected: number;
        total_protected: number;
    }>;
}
