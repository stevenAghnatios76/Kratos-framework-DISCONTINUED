"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatMonitor = void 0;
class HeartbeatMonitor {
    workers;
    intervalSec;
    intervalId;
    constructor(workers, intervalSec) {
        this.workers = workers;
        this.intervalSec = intervalSec;
    }
    start() {
        this.intervalId = setInterval(() => {
            this.check();
        }, this.intervalSec * 1000);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
    check() {
        const healthy = [];
        const stalled = [];
        const completed = [];
        const failed = [];
        for (const [id, worker] of this.workers) {
            switch (worker.state) {
                case 'completed':
                    completed.push(id);
                    break;
                case 'failed':
                    failed.push(id);
                    break;
                case 'running':
                    if (worker.isStalled(this.intervalSec * 2)) {
                        stalled.push(id);
                    }
                    else {
                        healthy.push(id);
                    }
                    break;
                case 'stalled':
                    stalled.push(id);
                    break;
                default:
                    break;
            }
        }
        return { healthy, stalled, completed, failed };
    }
    async handleStalled(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker)
            return;
        console.warn(`[heartbeat] Worker ${workerId} appears stalled, waiting one more interval...`);
        worker.state = 'stalled';
        // Wait one more interval before aborting
        await new Promise(resolve => setTimeout(resolve, this.intervalSec * 1000));
        if (worker.isStalled(this.intervalSec)) {
            console.error(`[heartbeat] Worker ${workerId} confirmed stalled, aborting.`);
            await worker.abort();
        }
    }
}
exports.HeartbeatMonitor = HeartbeatMonitor;
//# sourceMappingURL=heartbeat.js.map