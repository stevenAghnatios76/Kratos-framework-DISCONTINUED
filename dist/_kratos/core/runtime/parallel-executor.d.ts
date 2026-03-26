import { WorkerResult } from './worker';
export interface ParallelExecutorConfig {
    max_concurrent: number;
    mode: 'auto' | 'sequential' | 'parallel';
    conflict_detection: boolean;
    heartbeat_interval_sec: number;
    stall_timeout_sec: number;
    execution_mode: 'normal' | 'yolo';
}
export interface SprintExecutionReport {
    sprint_id: string;
    total_stories: number;
    completed: number;
    failed: number;
    skipped: number;
    conflicts_detected: number;
    total_duration_sec: number;
    wave_results: {
        wave: number;
        stories: WorkerResult[];
        duration_sec: number;
    }[];
}
export declare class ParallelExecutor {
    private workers;
    private graph;
    private config;
    private conflictDetector;
    private monitor;
    constructor(config: ParallelExecutorConfig);
    executeSprint(sprintStatusPath: string): Promise<SprintExecutionReport>;
    executeReviewsParallel(storyKey: string): Promise<{
        results: Record<string, 'PASSED' | 'FAILED'>;
        all_passed: boolean;
        duration_sec: number;
    }>;
    monitorWorkers(): Promise<void>;
    getStatus(): {
        running_workers: number;
        completed: number;
        failed: number;
        queue_size: number;
    };
    stopAll(): Promise<void>;
    private executeStory;
    private chunk;
}
