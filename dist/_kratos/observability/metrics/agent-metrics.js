"use strict";
// Kratos Agent Metrics
// Per-agent pass rates, token usage, and learning trends.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMetrics = void 0;
const collector_js_1 = require("./collector.js");
class AgentMetrics {
    manager;
    collector;
    constructor(manager) {
        this.manager = manager;
        this.collector = new collector_js_1.MetricsCollector(manager);
    }
    /**
     * Compute per-agent statistics from trajectories and memory.
     */
    calculate() {
        const db = this.manager.getDatabase();
        // Get all agents with trajectory data
        const agentResult = db.exec('SELECT DISTINCT agent_id FROM trajectories ORDER BY agent_id');
        const agentIds = agentResult.length
            ? agentResult[0].values.map((r) => r[0])
            : [];
        // Also check memory_entries for agents without trajectories
        const memAgentResult = db.exec('SELECT DISTINCT agent_id FROM memory_entries ORDER BY agent_id');
        if (memAgentResult.length) {
            for (const row of memAgentResult[0].values) {
                const id = row[0];
                if (!agentIds.includes(id))
                    agentIds.push(id);
            }
        }
        const agents = [];
        for (const agent_id of agentIds) {
            // Trajectory stats
            const trajResult = db.exec(`SELECT COUNT(*), COALESCE(AVG(score), 0),
                SUM(CASE WHEN score >= 0.7 THEN 1 ELSE 0 END),
                SUM(CASE WHEN score < 0.7 AND score IS NOT NULL THEN 1 ELSE 0 END)
         FROM trajectories WHERE agent_id = ?`, [agent_id]);
            const total_workflows = trajResult[0]?.values[0]?.[0] || 0;
            const avg_score = trajResult[0]?.values[0]?.[1] || 0;
            const passed = trajResult[0]?.values[0]?.[2] || 0;
            const failed = trajResult[0]?.values[0]?.[3] || 0;
            // Patterns learned
            const patResult = db.exec(`SELECT COUNT(*) FROM memory_entries WHERE agent_id = ? AND partition = 'patterns' AND status = 'active'`, [agent_id]);
            const patterns_learned = patResult[0]?.values[0]?.[0] || 0;
            // Anti-patterns
            const antiResult = db.exec(`SELECT COUNT(*) FROM memory_entries WHERE agent_id = ? AND partition = 'anti-patterns' AND status = 'active'`, [agent_id]);
            const anti_patterns = antiResult[0]?.values[0]?.[0] || 0;
            // Cost from metrics table
            const costResult = db.exec(`SELECT COALESCE(SUM(value), 0) FROM metrics
         WHERE metric_type = 'cost' AND json_extract(dimensions, '$.agent_id') = ?`, [agent_id]);
            const total_cost = costResult[0]?.values[0]?.[0] || 0;
            // Token usage from metrics
            const tokenResult = db.exec(`SELECT COALESCE(SUM(json_extract(dimensions, '$.input_tokens')), 0) +
                COALESCE(SUM(json_extract(dimensions, '$.output_tokens')), 0)
         FROM metrics
         WHERE metric_type = 'cost' AND json_extract(dimensions, '$.agent_id') = ?`, [agent_id]);
            const total_tokens = tokenResult[0]?.values[0]?.[0] || 0;
            const pass_rate = total_workflows > 0 ? passed / total_workflows : 0;
            agents.push({
                agent_id, total_workflows, passed, failed, pass_rate,
                total_tokens, total_cost, patterns_learned, anti_patterns, avg_score,
            });
        }
        // Sort by pass rate desc, then by total workflows desc
        agents.sort((a, b) => b.pass_rate - a.pass_rate || b.total_workflows - a.total_workflows);
        const total_workflows = agents.reduce((s, a) => s + a.total_workflows, 0);
        const total_passed = agents.reduce((s, a) => s + a.passed, 0);
        const overall_pass_rate = total_workflows > 0 ? total_passed / total_workflows : 0;
        const top_performer = agents.length > 0 ? agents[0].agent_id : null;
        return { agents, top_performer, total_workflows, overall_pass_rate };
    }
    /**
     * Record agent metrics snapshot.
     */
    recordMetrics(report) {
        const records = report.agents.map(a => ({
            metric_type: 'agent',
            metric_name: 'pass_rate',
            value: a.pass_rate,
            unit: 'ratio',
            dimensions: { agent_id: a.agent_id, total_workflows: a.total_workflows },
        }));
        this.collector.recordBatch(records);
    }
    /**
     * Format agent report for console display.
     */
    formatReport(report) {
        const lines = [
            'Agent Leaderboard',
            '='.repeat(50),
            '',
            `Total workflows: ${report.total_workflows}`,
            `Overall pass rate: ${(report.overall_pass_rate * 100).toFixed(1)}%`,
            `Top performer: ${report.top_performer || 'N/A'}`,
            '',
        ];
        if (report.agents.length === 0) {
            lines.push('No agent data available yet.');
            return lines.join('\n');
        }
        // Header
        lines.push(padRight('Agent', 20) + padRight('Workflows', 12) + padRight('Pass Rate', 12) +
            padRight('Patterns', 10) + padRight('Avg Score', 10));
        lines.push('-'.repeat(64));
        for (const a of report.agents) {
            lines.push(padRight(a.agent_id, 20) +
                padRight(String(a.total_workflows), 12) +
                padRight(`${(a.pass_rate * 100).toFixed(1)}%`, 12) +
                padRight(String(a.patterns_learned), 10) +
                padRight(a.avg_score.toFixed(2), 10));
        }
        return lines.join('\n');
    }
}
exports.AgentMetrics = AgentMetrics;
function padRight(s, len) {
    return s.length >= len ? s : s + ' '.repeat(len - s.length);
}
//# sourceMappingURL=agent-metrics.js.map