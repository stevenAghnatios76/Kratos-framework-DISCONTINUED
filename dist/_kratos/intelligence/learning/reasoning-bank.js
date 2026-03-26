"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasoningBank = void 0;
const trajectory_recorder_1 = require("./trajectory-recorder");
class ReasoningBank {
    db;
    recorder;
    constructor(db) {
        this.db = db;
        this.recorder = new trajectory_recorder_1.TrajectoryRecorder(db);
    }
    async retrievePatterns(opts) {
        const limit = opts.limit || 5;
        // Search patterns partition
        const patterns = await this.searchPartition('patterns', opts.agent_id, opts.context_keywords, limit);
        // Search anti-patterns partition
        const anti_patterns = await this.searchPartition('anti-patterns', opts.agent_id, opts.context_keywords, limit);
        // Search trajectories for similar workflow + context
        const similar_trajectories = await this.findSimilarTrajectories(opts.agent_id, opts.workflow, opts.context_keywords, limit);
        return { patterns, anti_patterns, similar_trajectories };
    }
    async formatForPrompt(patterns, antiPatterns) {
        let output = '';
        if (patterns.length > 0) {
            output += '## Learned Patterns (apply these)\n\n';
            for (let i = 0; i < patterns.length; i++) {
                output += `${i + 1}. **${patterns[i].title}** (score: ${patterns[i].score.toFixed(2)}) — ${patterns[i].content.split('\n')[0]}\n`;
            }
            output += '\n';
        }
        if (antiPatterns.length > 0) {
            output += '## Anti-Patterns (avoid these)\n\n';
            for (let i = 0; i < antiPatterns.length; i++) {
                output += `${i + 1}. **${antiPatterns[i].title}** (score: ${antiPatterns[i].score.toFixed(2)}) — ${antiPatterns[i].content.split('\n')[0]}\n`;
            }
            output += '\n';
        }
        if (patterns.length === 0 && antiPatterns.length === 0) {
            output = '## No Learned Patterns Yet\n\nNo relevant patterns found for this context.\n';
        }
        return output;
    }
    async markUsed(entryId) {
        const database = this.db.getDatabase();
        database.run(`UPDATE memory_entries SET use_count = use_count + 1, last_used_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, [entryId]);
    }
    async searchPartition(partition, agent_id, keywords, limit) {
        const results = [];
        const seenIds = new Set();
        for (const keyword of keywords) {
            const matches = await this.db.search(keyword, {
                partition,
                limit: limit * 2,
            });
            for (const match of matches) {
                if (!seenIds.has(match.id)) {
                    seenIds.add(match.id);
                    results.push(match);
                }
            }
        }
        // Also include agent-specific entries
        const agentEntries = await this.db.query({
            partition,
            agent_id,
            status: 'active',
            limit,
            order_by: 'score',
        });
        for (const entry of agentEntries) {
            if (!seenIds.has(entry.id)) {
                seenIds.add(entry.id);
                results.push(entry);
            }
        }
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    async findSimilarTrajectories(agent_id, workflow, keywords, limit) {
        const trajectories = await this.recorder.getAgentTrajectories(agent_id, {
            workflow,
            minScore: 0.5,
            limit: limit * 3,
        });
        // Score trajectories by keyword overlap with context
        const scored = trajectories.map(traj => {
            const trajText = [
                ...traj.state_context.requirements,
                ...traj.state_context.constraints,
                traj.action_taken.decision,
                traj.action_taken.approach,
            ].join(' ').toLowerCase();
            const matchCount = keywords.filter(k => trajText.includes(k.toLowerCase())).length;
            const relevance = keywords.length > 0 ? matchCount / keywords.length : 0;
            return { traj, relevance };
        });
        return scored
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit)
            .map(s => s.traj);
    }
}
exports.ReasoningBank = ReasoningBank;
//# sourceMappingURL=reasoning-bank.js.map