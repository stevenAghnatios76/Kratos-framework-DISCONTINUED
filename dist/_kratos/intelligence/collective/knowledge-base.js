"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectiveKnowledge = void 0;
class CollectiveKnowledge {
    db;
    constructor(db) {
        this.db = db;
    }
    async shareFact(publisherAgent, title, content, tags) {
        return this.db.store({
            partition: 'facts',
            agent_id: publisherAgent,
            access_level: 'global',
            title,
            content,
            tags,
            metadata: { shared_by: publisherAgent },
            score: 0.5,
            status: 'active',
            ttl_days: 90,
        });
    }
    async shareDecision(publisherAgent, title, content, tags) {
        return this.db.store({
            partition: 'decisions',
            agent_id: publisherAgent,
            access_level: 'team-shared',
            title,
            content,
            tags,
            metadata: { shared_by: publisherAgent },
            score: 0.5,
            status: 'active',
            ttl_days: 90,
        });
    }
    async sharePattern(publisherAgent, title, content, score) {
        return this.db.store({
            partition: 'patterns',
            agent_id: publisherAgent,
            access_level: 'global',
            title,
            content,
            tags: [],
            metadata: { shared_by: publisherAgent, promoted_to_global: true },
            score,
            status: 'active',
            ttl_days: 180,
        });
    }
    async shareAntiPattern(publisherAgent, title, content) {
        return this.db.store({
            partition: 'anti-patterns',
            agent_id: publisherAgent,
            access_level: 'global',
            title,
            content,
            tags: [],
            metadata: { shared_by: publisherAgent },
            score: 0.0,
            status: 'active',
            ttl_days: 180,
        });
    }
    async getSharedKnowledge(agentId, opts) {
        const database = this.db.getDatabase();
        const conditions = [
            "(access_level IN ('team-shared', 'global') OR agent_id = ?)",
            "status = 'active'",
        ];
        const values = [agentId];
        if (opts?.partition) {
            conditions.push('partition = ?');
            values.push(opts.partition);
        }
        if (opts?.tags && opts.tags.length > 0) {
            const tagConditions = opts.tags.map(() => "tags LIKE ?");
            conditions.push(`(${tagConditions.join(' OR ')})`);
            opts.tags.forEach(tag => values.push(`%"${tag}"%`));
        }
        const limit = opts?.limit || 50;
        values.push(limit);
        const sql = `SELECT * FROM memory_entries WHERE ${conditions.join(' AND ')} ORDER BY score DESC, updated_at DESC LIMIT ?`;
        const result = database.exec(sql, values);
        if (!result.length)
            return [];
        return result[0].values.map((row) => {
            const obj = {};
            result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
            return {
                id: obj.id,
                partition: obj.partition,
                agent_id: obj.agent_id,
                access_level: obj.access_level,
                title: obj.title,
                content: obj.content,
                tags: JSON.parse(obj.tags || '[]'),
                metadata: JSON.parse(obj.metadata || '{}'),
                score: obj.score,
                use_count: obj.use_count,
                status: obj.status,
                ttl_days: obj.ttl_days,
                created_at: obj.created_at,
                updated_at: obj.updated_at,
            };
        });
    }
    async getRelevantDecisions(agentId, limit = 10) {
        return this.getSharedKnowledge(agentId, {
            partition: 'decisions',
            limit,
        });
    }
}
exports.CollectiveKnowledge = CollectiveKnowledge;
//# sourceMappingURL=knowledge-base.js.map