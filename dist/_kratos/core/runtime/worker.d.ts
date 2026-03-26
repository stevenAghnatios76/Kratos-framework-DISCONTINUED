export interface WorkerConfig {
    id: string;
    story_key: string;
    workflow: string;
    mode: 'normal' | 'yolo';
    timeout_sec: number;
}
export interface WorkerResult {
    worker_id: string;
    story_key: string;
    status: 'completed' | 'failed' | 'timeout' | 'conflict';
    files_modified: string[];
    duration_sec: number;
    error?: string;
    checkpoint_path?: string;
}
export type WorkerState = 'idle' | 'running' | 'completed' | 'failed' | 'stalled';
export declare class Worker {
    readonly id: string;
    state: WorkerState;
    lastHeartbeat: Date;
    private config;
    private process;
    private startTime;
    private result;
    constructor(config: WorkerConfig);
    execute(): Promise<WorkerResult>;
    heartbeat(): void;
    isStalled(timeoutSec: number): boolean;
    abort(): Promise<void>;
    getStatus(): {
        state: WorkerState;
        elapsed_sec: number;
        story_key: string;
    };
    private buildCommand;
    private parseFilesModified;
}
