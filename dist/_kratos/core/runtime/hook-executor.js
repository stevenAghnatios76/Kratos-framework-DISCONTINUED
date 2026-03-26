"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookExecutor = exports.HaltError = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
class HaltError extends Error {
    constructor(hookPoint, command, stderr) {
        super(`Hook halted workflow at ${hookPoint}: ${command}\n${stderr}`);
        this.name = 'HaltError';
    }
}
exports.HaltError = HaltError;
class HookExecutor {
    hooks = {};
    configPath;
    constructor(hooksConfigPath) {
        this.configPath = hooksConfigPath;
    }
    async loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            this.hooks = {};
            return;
        }
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = yaml.parse(content);
        this.hooks = parsed?.hooks || {};
        // Normalize: ensure all values are arrays
        for (const [key, value] of Object.entries(this.hooks)) {
            if (!Array.isArray(value)) {
                this.hooks[key] = [];
            }
        }
    }
    async execute(hookPoint, context) {
        const hookDefs = this.hooks[hookPoint];
        if (!hookDefs || hookDefs.length === 0)
            return [];
        const results = [];
        for (const hook of hookDefs) {
            // Check condition if present
            if (hook.condition && !this.evaluateCondition(hook.condition, context)) {
                continue;
            }
            const resolvedCommand = this.resolveCommand(hook.command, context);
            const timeout = (hook.timeout || 30) * 1000;
            const startTime = Date.now();
            let exitCode = 0;
            let stdout = '';
            let stderr = '';
            try {
                const output = (0, child_process_1.execSync)(resolvedCommand, {
                    timeout,
                    encoding: 'utf-8',
                    env: { ...process.env, ...hook.env },
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                stdout = output || '';
            }
            catch (err) {
                const execErr = err;
                exitCode = execErr.status || 1;
                stdout = execErr.stdout || '';
                stderr = execErr.stderr || '';
            }
            const durationMs = Date.now() - startTime;
            let actionTaken = 'continued';
            if (exitCode !== 0) {
                switch (hook.on_fail) {
                    case 'halt':
                        actionTaken = 'halted';
                        results.push({
                            hook_point: hookPoint,
                            command: resolvedCommand,
                            exit_code: exitCode,
                            stdout,
                            stderr,
                            duration_ms: durationMs,
                            action_taken: actionTaken,
                        });
                        throw new HaltError(hookPoint, resolvedCommand, stderr);
                    case 'warn':
                        actionTaken = 'warned';
                        console.warn(`[hook:${hookPoint}] Warning: ${resolvedCommand} exited with code ${exitCode}`);
                        if (stderr)
                            console.warn(`  ${stderr.split('\n')[0]}`);
                        break;
                    case 'skip':
                        actionTaken = 'continued';
                        break;
                }
            }
            results.push({
                hook_point: hookPoint,
                command: resolvedCommand,
                exit_code: exitCode,
                stdout,
                stderr,
                duration_ms: durationMs,
                action_taken: actionTaken,
            });
        }
        return results;
    }
    resolveCommand(command, context) {
        return command.replace(/\{(\w+)\}/g, (match, key) => {
            const value = context[key];
            if (value === undefined || value === null)
                return match;
            if (Array.isArray(value))
                return value.join(' ');
            return String(value);
        });
    }
    evaluateCondition(condition, context) {
        // Simple condition evaluation: "key.exists" or "key.equals:value"
        const parts = condition.split('.');
        if (parts.length < 2)
            return true;
        const key = parts[0];
        const check = parts.slice(1).join('.');
        const value = context[key];
        if (check === 'exists')
            return value !== undefined && value !== null;
        if (check.startsWith('equals:')) {
            const expected = check.substring(7);
            return String(value) === expected;
        }
        if (check === 'has_tests')
            return true; // Default assumption
        return true;
    }
    addHook(hookPoint, hook) {
        if (!this.hooks[hookPoint])
            this.hooks[hookPoint] = [];
        this.hooks[hookPoint].push(hook);
    }
    removeHook(hookPoint, index) {
        if (this.hooks[hookPoint] && index < this.hooks[hookPoint].length) {
            this.hooks[hookPoint].splice(index, 1);
        }
    }
    listHooks() {
        return { ...this.hooks };
    }
}
exports.HookExecutor = HookExecutor;
//# sourceMappingURL=hook-executor.js.map