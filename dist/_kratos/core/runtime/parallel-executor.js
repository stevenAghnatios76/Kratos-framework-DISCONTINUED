"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelExecutor = void 0;
const dependency_graph_1 = require("./dependency-graph");
const worker_1 = require("./worker");
const conflict_detector_1 = require("./conflict-detector");
const heartbeat_1 = require("./heartbeat");
const REVIEW_WORKFLOWS = [
    '/kratos-code-review',
    '/kratos-qa-tests',
    '/kratos-security-review',
    '/kratos-test-automate',
    '/kratos-test-review',
    '/kratos-performance-review',
];
class ParallelExecutor {
    workers = new Map();
    graph;
    config;
    conflictDetector;
    monitor = null;
    constructor(config) {
        this.config = config;
        this.graph = new dependency_graph_1.DependencyGraph();
        this.conflictDetector = new conflict_detector_1.ConflictDetector();
    }
    async executeSprint(sprintStatusPath) {
        const startTime = Date.now();
        await this.graph.buildFromSprint(sprintStatusPath);
        const plan = this.graph.generatePlan();
        const report = {
            sprint_id: sprintStatusPath,
            total_stories: plan.total_stories,
            completed: 0,
            failed: 0,
            skipped: 0,
            conflicts_detected: 0,
            total_duration_sec: 0,
            wave_results: [],
        };
        // Start heartbeat monitor
        this.monitor = new heartbeat_1.HeartbeatMonitor(this.workers, this.config.heartbeat_interval_sec);
        this.monitor.start();
        try {
            for (let waveIdx = 0; waveIdx < plan.waves.length; waveIdx++) {
                const wave = plan.waves[waveIdx];
                const waveStart = Date.now();
                const waveResults = [];
                // Pre-check for conflicts in this wave
                if (this.config.conflict_detection) {
                    const estimated = await this.conflictDetector.estimateConflicts(wave);
                    if (estimated.length > 0) {
                        console.warn(`[executor] Wave ${waveIdx + 1}: ${estimated.length} potential conflicts detected`);
                        console.warn(this.conflictDetector.formatForReview(estimated));
                    }
                }
                if (this.config.mode === 'sequential' || wave.length === 1) {
                    // Run sequentially
                    for (const story of wave) {
                        const result = await this.executeStory(story.story_key, `/kratos-dev-story`);
                        waveResults.push(result);
                        if (result.status === 'completed') {
                            report.completed++;
                            this.graph.markComplete(story.story_key);
                        }
                        else {
                            report.failed++;
                        }
                    }
                }
                else {
                    // Run in parallel (up to max_concurrent)
                    const batches = this.chunk(wave, this.config.max_concurrent);
                    for (const batch of batches) {
                        const promises = batch.map(story => this.executeStory(story.story_key, `/kratos-dev-story`));
                        const results = await Promise.all(promises);
                        waveResults.push(...results);
                        for (const result of results) {
                            if (result.status === 'completed') {
                                report.completed++;
                                this.graph.markComplete(result.story_key);
                            }
                            else {
                                report.failed++;
                            }
                        }
                        // Check for conflicts between completed workers
                        if (this.config.conflict_detection) {
                            const completedResults = results.filter(r => r.status === 'completed');
                            const conflicts = await this.conflictDetector.detect(completedResults);
                            report.conflicts_detected += conflicts.length;
                            if (conflicts.length > 0) {
                                console.warn(this.conflictDetector.formatForReview(conflicts));
                            }
                        }
                    }
                }
                const waveDuration = (Date.now() - waveStart) / 1000;
                report.wave_results.push({
                    wave: waveIdx + 1,
                    stories: waveResults,
                    duration_sec: waveDuration,
                });
            }
            report.skipped = plan.blocked.length;
        }
        finally {
            this.monitor?.stop();
        }
        report.total_duration_sec = (Date.now() - startTime) / 1000;
        return report;
    }
    async executeReviewsParallel(storyKey) {
        const startTime = Date.now();
        const results = {};
        const promises = REVIEW_WORKFLOWS.map(async (workflow, i) => {
            const worker = new worker_1.Worker({
                id: `review-${i}`,
                story_key: storyKey,
                workflow,
                mode: 'normal',
                timeout_sec: this.config.stall_timeout_sec,
            });
            this.workers.set(worker.id, worker);
            const result = await worker.execute();
            return { workflow, result };
        });
        const reviewResults = await Promise.all(promises);
        for (const { workflow, result } of reviewResults) {
            const reviewName = workflow.replace('/kratos-', '');
            results[reviewName] = result.status === 'completed' ? 'PASSED' : 'FAILED';
        }
        const duration_sec = (Date.now() - startTime) / 1000;
        const all_passed = Object.values(results).every(r => r === 'PASSED');
        return { results, all_passed, duration_sec };
    }
    async monitorWorkers() {
        if (!this.monitor)
            return;
        const status = this.monitor.check();
        for (const stalledId of status.stalled) {
            await this.monitor.handleStalled(stalledId);
        }
    }
    getStatus() {
        let running = 0;
        let completed = 0;
        let failed = 0;
        for (const worker of this.workers.values()) {
            switch (worker.state) {
                case 'running':
                    running++;
                    break;
                case 'completed':
                    completed++;
                    break;
                case 'failed':
                    failed++;
                    break;
            }
        }
        return { running_workers: running, completed, failed, queue_size: 0 };
    }
    async stopAll() {
        this.monitor?.stop();
        const abortPromises = [];
        for (const worker of this.workers.values()) {
            if (worker.state === 'running') {
                abortPromises.push(worker.abort());
            }
        }
        await Promise.all(abortPromises);
    }
    async executeStory(storyKey, workflow) {
        const workerId = `worker-${storyKey}-${Date.now()}`;
        const worker = new worker_1.Worker({
            id: workerId,
            story_key: storyKey,
            workflow,
            mode: this.config.execution_mode,
            timeout_sec: this.config.stall_timeout_sec,
        });
        this.workers.set(workerId, worker);
        return worker.execute();
    }
    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
}
exports.ParallelExecutor = ParallelExecutor;
//# sourceMappingURL=parallel-executor.js.map