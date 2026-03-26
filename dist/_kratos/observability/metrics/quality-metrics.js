"use strict";
// Kratos Quality Metrics
// First-pass review rate, gate pass rates, and quality score.
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityMetrics = void 0;
const collector_js_1 = require("./collector.js");
const REVIEW_GATES = [
    'code-review',
    'qa-tests',
    'security-review',
    'test-automate',
    'test-review',
    'performance-review',
];
class QualityMetrics {
    manager;
    collector;
    constructor(manager) {
        this.manager = manager;
        this.collector = new collector_js_1.MetricsCollector(manager);
    }
    /**
     * Calculate quality metrics from trajectory scores and review gate data.
     */
    calculate() {
        const db = this.manager.getDatabase();
        // Get review trajectories grouped by story
        const storyResult = db.exec(`SELECT DISTINCT story_key FROM trajectories WHERE story_key IS NOT NULL`);
        const storyKeys = storyResult.length
            ? storyResult[0].values.map((r) => r[0])
            : [];
        let stories_reviewed = 0;
        let stories_passed_first = 0;
        // Per-gate stats
        const gateStats = {};
        for (const gate of REVIEW_GATES) {
            gateStats[gate] = { total: 0, passed: 0 };
        }
        for (const storyKey of storyKeys) {
            const reviewResult = db.exec(`SELECT workflow, score FROM trajectories
         WHERE story_key = ? AND workflow LIKE '%review%'
         ORDER BY created_at ASC`, [storyKey]);
            if (!reviewResult.length)
                continue;
            stories_reviewed++;
            let allPassedFirst = true;
            // Track first attempt per gate per story
            const firstAttempt = {};
            for (const row of reviewResult[0].values) {
                const workflow = row[0];
                const score = row[1];
                // Match workflow to gate
                for (const gate of REVIEW_GATES) {
                    if (workflow.includes(gate)) {
                        gateStats[gate].total++;
                        const passed = score !== null && score >= 0.7;
                        if (passed)
                            gateStats[gate].passed++;
                        // First attempt tracking
                        if (!(gate in firstAttempt)) {
                            firstAttempt[gate] = passed;
                            if (!passed)
                                allPassedFirst = false;
                        }
                        break;
                    }
                }
            }
            if (allPassedFirst && Object.keys(firstAttempt).length > 0) {
                stories_passed_first++;
            }
        }
        const first_pass_rate = stories_reviewed > 0
            ? stories_passed_first / stories_reviewed
            : 0;
        const gate_results = REVIEW_GATES.map(gate => ({
            gate,
            total: gateStats[gate].total,
            passed: gateStats[gate].passed,
            failed: gateStats[gate].total - gateStats[gate].passed,
            pass_rate: gateStats[gate].total > 0
                ? gateStats[gate].passed / gateStats[gate].total
                : 0,
        }));
        const totalGateChecks = gate_results.reduce((s, g) => s + g.total, 0);
        const totalGatePassed = gate_results.reduce((s, g) => s + g.passed, 0);
        const overall_gate_pass_rate = totalGateChecks > 0 ? totalGatePassed / totalGateChecks : 0;
        // Quality score (0-100): 50% first-pass rate + 50% gate pass rate
        const quality_score = Math.round(first_pass_rate * 50 + overall_gate_pass_rate * 50);
        return {
            first_pass_rate,
            gate_results,
            overall_gate_pass_rate,
            quality_score,
            stories_reviewed,
            stories_passed_first,
        };
    }
    /**
     * Record quality metrics.
     */
    recordMetrics(report) {
        this.collector.recordBatch([
            { metric_type: 'quality', metric_name: 'first_pass_rate', value: report.first_pass_rate, unit: 'ratio' },
            { metric_type: 'quality', metric_name: 'gate_pass_rate', value: report.overall_gate_pass_rate, unit: 'ratio' },
            { metric_type: 'quality', metric_name: 'quality_score', value: report.quality_score, unit: 'score' },
        ]);
    }
    /**
     * Format quality report for console display.
     */
    formatReport(report) {
        const lines = [
            'Quality Report',
            '='.repeat(50),
            '',
            `Quality score:       ${report.quality_score}/100`,
            `First-pass rate:     ${(report.first_pass_rate * 100).toFixed(1)}%`,
            `Overall gate rate:   ${(report.overall_gate_pass_rate * 100).toFixed(1)}%`,
            `Stories reviewed:    ${report.stories_reviewed}`,
            `Passed first try:    ${report.stories_passed_first}`,
            '',
            'Gate Breakdown:',
        ];
        // Header
        lines.push(padRight('Gate', 25) + padRight('Total', 8) +
            padRight('Passed', 8) + padRight('Rate', 10));
        lines.push('-'.repeat(51));
        for (const gate of report.gate_results) {
            lines.push(padRight(gate.gate, 25) +
                padRight(String(gate.total), 8) +
                padRight(String(gate.passed), 8) +
                padRight(`${(gate.pass_rate * 100).toFixed(1)}%`, 10));
        }
        return lines.join('\n');
    }
}
exports.QualityMetrics = QualityMetrics;
function padRight(s, len) {
    return s.length >= len ? s : s + ' '.repeat(len - s.length);
}
//# sourceMappingURL=quality-metrics.js.map