"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const child_process_1 = require("child_process");
class Worker {
    id;
    state = 'idle';
    lastHeartbeat;
    config;
    process = null;
    startTime = null;
    result = null;
    constructor(config) {
        this.id = config.id;
        this.config = config;
        this.lastHeartbeat = new Date();
    }
    async execute() {
        this.state = 'running';
        this.startTime = new Date();
        this.heartbeat();
        return new Promise((resolve) => {
            const timeoutMs = this.config.timeout_sec * 1000;
            try {
                // Build the command to invoke the workflow
                const cmd = this.buildCommand();
                const child = (0, child_process_1.spawn)('sh', ['-c', cmd], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    timeout: timeoutMs,
                });
                this.process = child;
                let stdout = '';
                let stderr = '';
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                    this.heartbeat();
                });
                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
                const timer = setTimeout(() => {
                    child.kill('SIGTERM');
                    this.state = 'failed';
                    const duration = (Date.now() - this.startTime.getTime()) / 1000;
                    this.result = {
                        worker_id: this.id,
                        story_key: this.config.story_key,
                        status: 'timeout',
                        files_modified: [],
                        duration_sec: duration,
                        error: `Worker timed out after ${this.config.timeout_sec}s`,
                    };
                    resolve(this.result);
                }, timeoutMs);
                child.on('close', (code) => {
                    clearTimeout(timer);
                    const duration = (Date.now() - this.startTime.getTime()) / 1000;
                    const filesModified = this.parseFilesModified(stdout);
                    if (code === 0) {
                        this.state = 'completed';
                        this.result = {
                            worker_id: this.id,
                            story_key: this.config.story_key,
                            status: 'completed',
                            files_modified: filesModified,
                            duration_sec: duration,
                        };
                    }
                    else {
                        this.state = 'failed';
                        this.result = {
                            worker_id: this.id,
                            story_key: this.config.story_key,
                            status: 'failed',
                            files_modified: filesModified,
                            duration_sec: duration,
                            error: stderr || `Process exited with code ${code}`,
                        };
                    }
                    resolve(this.result);
                });
                child.on('error', (err) => {
                    clearTimeout(timer);
                    const duration = (Date.now() - this.startTime.getTime()) / 1000;
                    this.state = 'failed';
                    this.result = {
                        worker_id: this.id,
                        story_key: this.config.story_key,
                        status: 'failed',
                        files_modified: [],
                        duration_sec: duration,
                        error: err.message,
                    };
                    resolve(this.result);
                });
            }
            catch (err) {
                const duration = this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0;
                this.state = 'failed';
                this.result = {
                    worker_id: this.id,
                    story_key: this.config.story_key,
                    status: 'failed',
                    files_modified: [],
                    duration_sec: duration,
                    error: err instanceof Error ? err.message : String(err),
                };
                resolve(this.result);
            }
        });
    }
    heartbeat() {
        this.lastHeartbeat = new Date();
    }
    isStalled(timeoutSec) {
        if (this.state !== 'running')
            return false;
        const elapsed = (Date.now() - this.lastHeartbeat.getTime()) / 1000;
        return elapsed > timeoutSec;
    }
    async abort() {
        if (this.process && !this.process.killed) {
            this.process.kill('SIGTERM');
            // Give it a moment to clean up, then force kill
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                }
            }, 5000);
        }
        this.state = 'failed';
    }
    getStatus() {
        const elapsed = this.startTime
            ? (Date.now() - this.startTime.getTime()) / 1000
            : 0;
        return {
            state: this.state,
            elapsed_sec: Math.round(elapsed),
            story_key: this.config.story_key,
        };
    }
    buildCommand() {
        // The command invokes Claude Code with the appropriate workflow
        const workflow = this.config.workflow;
        const storyKey = this.config.story_key;
        return `echo "Executing ${workflow} for ${storyKey} (worker: ${this.id}, mode: ${this.config.mode})"`;
    }
    parseFilesModified(stdout) {
        // Parse checkpoint output to extract files modified
        const files = [];
        const lines = stdout.split('\n');
        for (const line of lines) {
            const match = line.match(/files_modified:\s*(.+)/);
            if (match) {
                files.push(...match[1].split(',').map(f => f.trim()).filter(Boolean));
            }
        }
        return files;
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map