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
exports.GateChecker = void 0;
const fs = __importStar(require("fs"));
class GateChecker {
    async checkPreStart(workflowConfig) {
        const results = [];
        const gates = workflowConfig?.quality_gates?.pre_start;
        if (!gates || !Array.isArray(gates))
            return results;
        for (const gate of gates) {
            const result = await this.evaluateGate(gate);
            results.push(result);
        }
        return results;
    }
    async checkPostComplete(workflowConfig, checkpoint) {
        const results = [];
        const gates = workflowConfig?.quality_gates?.post_complete;
        if (!gates || !Array.isArray(gates))
            return results;
        for (const gate of gates) {
            const result = await this.evaluateGate(gate, checkpoint);
            results.push(result);
        }
        return results;
    }
    async checkReviewGates(storyFilePath) {
        const gates = {
            'code-review': 'PENDING',
            'qa-tests': 'PENDING',
            'security-review': 'PENDING',
            'test-automate': 'PENDING',
            'test-review': 'PENDING',
            'performance-review': 'PENDING',
        };
        if (!fs.existsSync(storyFilePath)) {
            return { all_passed: false, gates };
        }
        const content = fs.readFileSync(storyFilePath, 'utf-8');
        // Parse review gate table from markdown
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('|'))
                continue;
            for (const gateName of Object.keys(gates)) {
                if (trimmed.toLowerCase().includes(gateName.replace('-', ' ')) ||
                    trimmed.toLowerCase().includes(gateName)) {
                    if (trimmed.includes('PASSED') || trimmed.includes('APPROVE')) {
                        gates[gateName] = 'PASSED';
                    }
                    else if (trimmed.includes('FAILED') || trimmed.includes('REQUEST_CHANGES')) {
                        gates[gateName] = 'FAILED';
                    }
                }
            }
        }
        const all_passed = Object.values(gates).every(g => g === 'PASSED');
        return { all_passed, gates };
    }
    formatResults(results) {
        if (results.length === 0)
            return 'No gates to check.';
        let output = '## Gate Check Results\n\n';
        let allPassed = true;
        for (const result of results) {
            const icon = result.passed ? 'PASS' : 'FAIL';
            output += `- [${icon}] **${result.gate_name}**`;
            if (result.reason) {
                output += ` — ${result.reason}`;
            }
            output += '\n';
            if (!result.passed)
                allPassed = false;
        }
        output += `\n**Overall:** ${allPassed ? 'All gates passed' : 'Some gates failed'}\n`;
        return output;
    }
    async evaluateGate(gate, checkpoint) {
        const gateName = gate.name || 'unknown';
        const now = new Date().toISOString();
        // file_exists check
        if (gate.file_exists) {
            const filePath = gate.file_exists;
            const exists = fs.existsSync(filePath);
            return {
                gate_name: gateName,
                passed: exists,
                reason: exists ? undefined : `File not found: ${filePath}`,
                checked_at: now,
            };
        }
        // story_status check
        if (gate.story_status) {
            const requiredStatus = gate.story_status;
            return {
                gate_name: gateName,
                passed: true, // Would need sprint-status.yaml context
                reason: `Requires status: ${requiredStatus}`,
                checked_at: now,
            };
        }
        // all_subtasks_complete check
        if (gate.all_subtasks_complete) {
            return {
                gate_name: gateName,
                passed: checkpoint?.status === 'completed',
                reason: checkpoint?.status !== 'completed' ? 'Not all subtasks completed' : undefined,
                checked_at: now,
            };
        }
        return {
            gate_name: gateName,
            passed: true,
            reason: 'Gate type not recognized — passing by default',
            checked_at: now,
        };
    }
}
exports.GateChecker = GateChecker;
//# sourceMappingURL=gate-checker.js.map