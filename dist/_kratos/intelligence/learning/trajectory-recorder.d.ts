import { MemoryManager } from '../memory/memory-manager';
export interface Trajectory {
    id?: number;
    agent_id: string;
    workflow: string;
    story_key?: string;
    state_context: {
        input_files: string[];
        requirements: string[];
        constraints: string[];
        similar_patterns: string[];
    };
    action_taken: {
        decision: string;
        files_modified: string[];
        approach: string;
        alternatives_considered: string[];
    };
    outcome?: {
        review_results: Record<string, 'PASSED' | 'FAILED' | 'APPROVE' | 'REQUEST_CHANGES'>;
        issues_found: string[];
        rework_required: boolean;
    };
    score?: number;
    scored_by?: string;
    created_at?: string;
    scored_at?: string;
}
export declare class TrajectoryRecorder {
    private db;
    constructor(db: MemoryManager);
    record(trajectory: Omit<Trajectory, 'id' | 'outcome' | 'score'>): Promise<number>;
    score(trajectoryId: number, outcome: Trajectory['outcome']): Promise<void>;
    getUnscored(storyKey: string): Promise<Trajectory[]>;
    getAgentTrajectories(agentId: string, opts?: {
        workflow?: string;
        minScore?: number;
        limit?: number;
    }): Promise<Trajectory[]>;
    getAllScored(opts?: {
        minScore?: number;
        limit?: number;
    }): Promise<Trajectory[]>;
    private rowToTrajectory;
}
