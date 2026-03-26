import { Worker } from './worker';
export declare class HeartbeatMonitor {
    private workers;
    private intervalSec;
    private intervalId?;
    constructor(workers: Map<string, Worker>, intervalSec: number);
    start(): void;
    stop(): void;
    check(): {
        healthy: string[];
        stalled: string[];
        completed: string[];
        failed: string[];
    };
    handleStalled(workerId: string): Promise<void>;
}
