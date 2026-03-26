"use strict";
// Kratos Ownership Map
// File-to-story-to-agent mapping from checkpoint data.
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
exports.OwnershipMap = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
class OwnershipMap {
    checkpointDir;
    constructor(checkpointDir) {
        this.checkpointDir = checkpointDir;
    }
    /**
     * Build ownership map from checkpoint files_touched data.
     */
    build() {
        const checkpoints = this.loadCheckpoints();
        const fileMap = new Map();
        for (const cp of checkpoints) {
            const filesTouched = cp.files_touched || [];
            const agentId = cp.agent_id || cp.workflow_name || 'unknown';
            const storyKey = cp.story_key || '';
            const workflow = cp.workflow_name || '';
            const date = cp.completed_at || cp.timestamp || '';
            for (const file of filesTouched) {
                const filePath = typeof file === 'string' ? file : (file.path || '');
                if (!filePath)
                    continue;
                if (!fileMap.has(filePath)) {
                    fileMap.set(filePath, {
                        stories: new Set(),
                        agents: new Set(),
                        workflow: '',
                        date: '',
                        touches: 0,
                    });
                }
                const entry = fileMap.get(filePath);
                if (storyKey)
                    entry.stories.add(storyKey);
                entry.agents.add(agentId);
                entry.workflow = workflow;
                entry.date = date;
                entry.touches++;
            }
        }
        const entries = [];
        const by_agent = {};
        const by_story = {};
        for (const [file, data] of fileMap) {
            entries.push({
                file,
                stories: Array.from(data.stories),
                agents: Array.from(data.agents),
                last_workflow: data.workflow,
                last_modified: data.date,
            });
            for (const agent of data.agents) {
                by_agent[agent] = (by_agent[agent] || 0) + 1;
            }
            for (const story of data.stories) {
                by_story[story] = (by_story[story] || 0) + 1;
            }
        }
        // Sort entries by touch count for hotspots
        const hotspots = Array.from(fileMap.entries())
            .map(([file, data]) => ({ file, touch_count: data.touches }))
            .sort((a, b) => b.touch_count - a.touch_count)
            .slice(0, 10);
        return {
            total_files: fileMap.size,
            total_entries: entries.length,
            by_agent,
            by_story,
            entries,
            hotspots,
        };
    }
    /**
     * Look up ownership for a specific file.
     */
    lookupFile(filePath) {
        const report = this.build();
        return report.entries.find(e => e.file === filePath || e.file.endsWith(filePath)) || null;
    }
    /**
     * Format ownership report for console display.
     */
    formatReport(report) {
        const lines = [
            'File Ownership Map',
            '='.repeat(50),
            '',
            `Tracked files:   ${report.total_files}`,
            '',
            'By Agent:',
        ];
        const sortedAgents = Object.entries(report.by_agent).sort((a, b) => b[1] - a[1]);
        for (const [agent, count] of sortedAgents) {
            lines.push(`  ${agent}: ${count} files`);
        }
        if (Object.keys(report.by_story).length > 0) {
            lines.push('', 'By Story:');
            const sortedStories = Object.entries(report.by_story).sort((a, b) => b[1] - a[1]);
            for (const [story, count] of sortedStories.slice(0, 10)) {
                lines.push(`  ${story}: ${count} files`);
            }
        }
        if (report.hotspots.length > 0) {
            lines.push('', 'File Hotspots (most touched):');
            for (const h of report.hotspots) {
                lines.push(`  ${h.file}: ${h.touch_count} touches`);
            }
        }
        return lines.join('\n');
    }
    loadCheckpoints() {
        if (!fs.existsSync(this.checkpointDir))
            return [];
        const files = fs.readdirSync(this.checkpointDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        const checkpoints = [];
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(this.checkpointDir, file), 'utf-8');
                const parsed = yaml.parse(content);
                if (parsed && typeof parsed === 'object') {
                    checkpoints.push(parsed);
                }
            }
            catch { /* skip malformed checkpoints */ }
        }
        return checkpoints;
    }
}
exports.OwnershipMap = OwnershipMap;
//# sourceMappingURL=ownership-map.js.map