export interface Checkpoint {
    workflow: string;
    step: number;
    total_steps: number;
    variables: Record<string, string>;
    output_path?: string;
    files_touched: {
        path: string;
        checksum: string;
        last_modified: string;
    }[];
    created_at: string;
    status: 'active' | 'completed';
}
export declare class CheckpointManager {
    private checkpointDir;
    constructor(checkpointDir: string);
    write(checkpoint: Checkpoint): Promise<string>;
    getLatest(workflow: string): Promise<Checkpoint | null>;
    validate(checkpoint: Checkpoint): Promise<{
        valid: boolean;
        changed_files: string[];
        missing_files: string[];
    }>;
    archive(checkpointPath: string): Promise<void>;
    listActive(): Promise<Checkpoint[]>;
    cleanup(maxAgeDays: number): Promise<number>;
}
