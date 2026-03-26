import { MemoryManager } from '../memory/memory-manager';
export interface Conflict {
    id?: number;
    agents: string[];
    topic: string;
    positions: {
        agent_id: string;
        position: string;
        reasoning: string;
        confidence: number;
    }[];
    resolution?: {
        resolved_by: 'authority-matrix' | 'human' | 'score';
        winner_agent: string;
        rationale: string;
        resolved_at: string;
    };
    created_at?: string;
}
export declare class ConsensusProtocol {
    private db;
    private authorityMatrix;
    private conflicts;
    private nextConflictId;
    constructor(db: MemoryManager);
    registerConflict(conflict: Omit<Conflict, 'id' | 'resolution'>): Promise<number>;
    autoResolve(conflictId: number): Promise<boolean>;
    formatForHumanResolution(conflictId: number): Promise<string>;
    resolveByHuman(conflictId: number, winnerAgent: string, rationale: string): Promise<void>;
    learnFromResolution(conflictId: number): Promise<void>;
    private classifyDomain;
}
