"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrajectoryRecorder = void 0;
class TrajectoryRecorder {
    db;
    constructor(db) {
        this.db = db;
    }
    async record(trajectory) {
        const database = this.db.getDatabase();
        database.run(`INSERT INTO trajectories (agent_id, workflow, story_key, state_context, action_taken)
       VALUES (?, ?, ?, ?, ?)`, [
            trajectory.agent_id,
            trajectory.workflow,
            trajectory.story_key || null,
            JSON.stringify(trajectory.state_context),
            JSON.stringify(trajectory.action_taken),
        ]);
        const result = database.exec('SELECT last_insert_rowid() as id');
        return result[0].values[0][0];
    }
    async score(trajectoryId, outcome) {
        if (!outcome)
            return;
        const reviews = Object.values(outcome.review_results);
        const passCount = reviews.filter(r => r === 'PASSED' || r === 'APPROVE').length;
        let computedScore = reviews.length > 0 ? passCount / reviews.length : 0;
        if (!outcome.rework_required) {
            computedScore = Math.min(1.0, computedScore + 0.1);
        }
        const database = this.db.getDatabase();
        database.run(`UPDATE trajectories SET outcome = ?, score = ?, scored_by = 'review-gates', score_details = ?, scored_at = datetime('now') WHERE id = ?`, [
            JSON.stringify(outcome),
            computedScore,
            JSON.stringify({
                pass_count: passCount,
                total_reviews: reviews.length,
                rework_bonus: !outcome.rework_required,
            }),
            trajectoryId,
        ]);
    }
    async getUnscored(storyKey) {
        const database = this.db.getDatabase();
        const result = database.exec('SELECT * FROM trajectories WHERE story_key = ? AND score IS NULL', [storyKey]);
        if (!result.length)
            return [];
        return result[0].values.map((row) => this.rowToTrajectory(result[0].columns, row));
    }
    async getAgentTrajectories(agentId, opts) {
        const database = this.db.getDatabase();
        const conditions = ['agent_id = ?'];
        const values = [agentId];
        if (opts?.workflow) {
            conditions.push('workflow = ?');
            values.push(opts.workflow);
        }
        if (opts?.minScore !== undefined) {
            conditions.push('score >= ?');
            values.push(opts.minScore);
        }
        const limit = opts?.limit || 50;
        values.push(limit);
        const sql = `SELECT * FROM trajectories WHERE ${conditions.join(' AND ')} AND score IS NOT NULL ORDER BY score DESC LIMIT ?`;
        const result = database.exec(sql, values);
        if (!result.length)
            return [];
        return result[0].values.map((row) => this.rowToTrajectory(result[0].columns, row));
    }
    async getAllScored(opts) {
        const database = this.db.getDatabase();
        const conditions = ['score IS NOT NULL'];
        const values = [];
        if (opts?.minScore !== undefined) {
            conditions.push('score >= ?');
            values.push(opts.minScore);
        }
        const limit = opts?.limit || 100;
        values.push(limit);
        const sql = `SELECT * FROM trajectories WHERE ${conditions.join(' AND ')} ORDER BY score DESC LIMIT ?`;
        const result = database.exec(sql, values);
        if (!result.length)
            return [];
        return result[0].values.map((row) => this.rowToTrajectory(result[0].columns, row));
    }
    rowToTrajectory(columns, row) {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return {
            id: obj.id,
            agent_id: obj.agent_id,
            workflow: obj.workflow,
            story_key: obj.story_key,
            state_context: JSON.parse(obj.state_context),
            action_taken: JSON.parse(obj.action_taken),
            outcome: obj.outcome ? JSON.parse(obj.outcome) : undefined,
            score: obj.score,
            scored_by: obj.scored_by,
            created_at: obj.created_at,
            scored_at: obj.scored_at,
        };
    }
}
exports.TrajectoryRecorder = TrajectoryRecorder;
//# sourceMappingURL=trajectory-recorder.js.map