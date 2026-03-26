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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const sql_js_1 = __importDefault(require("sql.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MemoryManager {
    db = null;
    dbPath;
    constructor(dbPath) {
        this.dbPath = dbPath;
    }
    async init() {
        const SQL = await (0, sql_js_1.default)();
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
        }
        else {
            this.db = new SQL.Database();
        }
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        this.db.run(schema);
        this.save();
    }
    save() {
        if (!this.db)
            return;
        const data = this.db.export();
        const buffer = Buffer.from(data);
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.dbPath, buffer);
    }
    getDb() {
        if (!this.db)
            throw new Error('Database not initialized. Call init() first.');
        return this.db;
    }
    // CRUD
    async store(entry) {
        const db = this.getDb();
        const expiresAt = entry.ttl_days
            ? new Date(Date.now() + entry.ttl_days * 86400000).toISOString()
            : null;
        db.run(`INSERT INTO memory_entries (partition, agent_id, access_level, title, content, tags, metadata, score, status, ttl_days, expires_at, source_workflow, source_story, source_session)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            entry.partition,
            entry.agent_id,
            entry.access_level,
            entry.title,
            entry.content,
            JSON.stringify(entry.tags),
            JSON.stringify(entry.metadata),
            entry.score,
            entry.status,
            entry.ttl_days,
            expiresAt,
            entry.source_workflow || null,
            entry.source_story || null,
            entry.source_session || null,
        ]);
        const result = db.exec('SELECT last_insert_rowid() as id');
        const id = result[0].values[0][0];
        this.save();
        return id;
    }
    async get(id) {
        const db = this.getDb();
        const result = db.exec('SELECT * FROM memory_entries WHERE id = ?', [id]);
        if (!result.length || !result[0].values.length)
            return null;
        return this.rowToEntry(result[0].columns, result[0].values[0]);
    }
    async update(id, changes) {
        const db = this.getDb();
        const sets = [];
        const values = [];
        if (changes.title !== undefined) {
            sets.push('title = ?');
            values.push(changes.title);
        }
        if (changes.content !== undefined) {
            sets.push('content = ?');
            values.push(changes.content);
        }
        if (changes.tags !== undefined) {
            sets.push('tags = ?');
            values.push(JSON.stringify(changes.tags));
        }
        if (changes.metadata !== undefined) {
            sets.push('metadata = ?');
            values.push(JSON.stringify(changes.metadata));
        }
        if (changes.score !== undefined) {
            sets.push('score = ?');
            values.push(changes.score);
        }
        if (changes.status !== undefined) {
            sets.push('status = ?');
            values.push(changes.status);
        }
        if (changes.ttl_days !== undefined) {
            sets.push('ttl_days = ?');
            values.push(changes.ttl_days);
            const expiresAt = new Date(Date.now() + changes.ttl_days * 86400000).toISOString();
            sets.push('expires_at = ?');
            values.push(expiresAt);
        }
        if (changes.access_level !== undefined) {
            sets.push('access_level = ?');
            values.push(changes.access_level);
        }
        if (sets.length === 0)
            return;
        sets.push("updated_at = datetime('now')");
        values.push(id);
        db.run(`UPDATE memory_entries SET ${sets.join(', ')} WHERE id = ?`, values);
        this.save();
    }
    async delete(id) {
        const db = this.getDb();
        db.run('DELETE FROM memory_entries WHERE id = ?', [id]);
        this.save();
    }
    // Query
    async query(opts) {
        const db = this.getDb();
        const conditions = [];
        const values = [];
        if (opts.partition) {
            conditions.push('partition = ?');
            values.push(opts.partition);
        }
        if (opts.agent_id) {
            conditions.push('agent_id = ?');
            values.push(opts.agent_id);
        }
        if (opts.access_level) {
            conditions.push('access_level = ?');
            values.push(opts.access_level);
        }
        if (opts.status) {
            conditions.push('status = ?');
            values.push(opts.status);
        }
        if (opts.tags && opts.tags.length > 0) {
            const tagConditions = opts.tags.map(() => "tags LIKE ?");
            conditions.push(`(${tagConditions.join(' OR ')})`);
            opts.tags.forEach(tag => values.push(`%"${tag}"%`));
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const orderBy = opts.order_by === 'score' ? 'score DESC' :
            opts.order_by === 'last_used_at' ? 'last_used_at DESC' :
                'created_at DESC';
        const limit = opts.limit || 100;
        const offset = opts.offset || 0;
        const sql = `SELECT * FROM memory_entries ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
        values.push(limit, offset);
        const result = db.exec(sql, values);
        if (!result.length)
            return [];
        return result[0].values.map((row) => this.rowToEntry(result[0].columns, row));
    }
    // Search
    async search(query, opts) {
        const db = this.getDb();
        const conditions = ["(title LIKE ? OR content LIKE ?)"];
        const searchTerm = `%${query}%`;
        const values = [searchTerm, searchTerm];
        if (opts?.partition) {
            conditions.push('partition = ?');
            values.push(opts.partition);
        }
        if (opts?.agent_id) {
            conditions.push('agent_id = ?');
            values.push(opts.agent_id);
        }
        const limit = opts?.limit || 20;
        values.push(limit);
        const sql = `SELECT * FROM memory_entries WHERE ${conditions.join(' AND ')} AND status = 'active' ORDER BY score DESC, updated_at DESC LIMIT ?`;
        const result = db.exec(sql, values);
        if (!result.length)
            return [];
        return result[0].values.map((row) => this.rowToEntry(result[0].columns, row));
    }
    // Agent-scoped helpers
    async getAgentMemory(agent_id) {
        const db = this.getDb();
        const sql = `SELECT * FROM memory_entries WHERE (agent_id = ? OR access_level IN ('team-shared', 'global')) AND status = 'active' ORDER BY score DESC, updated_at DESC`;
        const result = db.exec(sql, [agent_id]);
        if (!result.length)
            return [];
        return result[0].values.map((row) => this.rowToEntry(result[0].columns, row));
    }
    async storeDecision(agent_id, title, content, opts) {
        return this.store({
            partition: 'decisions',
            agent_id,
            access_level: 'agent-private',
            title,
            content,
            tags: [],
            metadata: {},
            score: 0.5,
            status: 'active',
            ttl_days: 90,
            ...opts,
        });
    }
    async storeFact(agent_id, title, content) {
        return this.store({
            partition: 'facts',
            agent_id,
            access_level: 'agent-private',
            title,
            content,
            tags: [],
            metadata: {},
            score: 0.5,
            status: 'active',
            ttl_days: 90,
        });
    }
    async storePattern(agent_id, title, content, score) {
        return this.store({
            partition: 'patterns',
            agent_id,
            access_level: 'agent-private',
            title,
            content,
            tags: [],
            metadata: {},
            score,
            status: 'active',
            ttl_days: 90,
        });
    }
    async storeAntiPattern(agent_id, title, content) {
        return this.store({
            partition: 'anti-patterns',
            agent_id,
            access_level: 'agent-private',
            title,
            content,
            tags: [],
            metadata: {},
            score: 0.0,
            status: 'active',
            ttl_days: 90,
        });
    }
    // Lifecycle
    async expireStaleEntries() {
        const db = this.getDb();
        const result = db.exec("SELECT COUNT(*) FROM memory_entries WHERE expires_at < datetime('now') AND status = 'active'");
        const count = result[0]?.values[0]?.[0] || 0;
        if (count > 0) {
            db.run("DELETE FROM memory_entries WHERE expires_at < datetime('now') AND status = 'active'");
            this.save();
        }
        return count;
    }
    async evictLRU(partition, maxEntries) {
        const db = this.getDb();
        const countResult = db.exec('SELECT COUNT(*) FROM memory_entries WHERE partition = ?', [partition]);
        const total = countResult[0]?.values[0]?.[0] || 0;
        if (total <= maxEntries)
            return 0;
        const toEvict = total - maxEntries;
        db.run(`DELETE FROM memory_entries WHERE id IN (
        SELECT id FROM memory_entries WHERE partition = ?
        ORDER BY COALESCE(last_used_at, created_at) ASC LIMIT ?
      )`, [partition, toEvict]);
        this.save();
        return toEvict;
    }
    async markStale(id) {
        await this.update(id, { status: 'stale' });
    }
    async markContradicted(id, reason) {
        const entry = await this.get(id);
        if (!entry)
            return;
        const metadata = { ...entry.metadata, contradiction_reason: reason };
        await this.update(id, { status: 'contradicted', metadata });
    }
    // Export
    async exportAgentSidecar(agent_id) {
        const entries = await this.query({ agent_id, status: 'active', order_by: 'score' });
        const partitions = {};
        for (const entry of entries) {
            if (!partitions[entry.partition])
                partitions[entry.partition] = [];
            partitions[entry.partition].push(entry);
        }
        let md = `# ${agent_id} — Memory Sidecar\n\n`;
        md += `*Exported at: ${new Date().toISOString()}*\n\n`;
        for (const [partition, items] of Object.entries(partitions)) {
            md += `## ${partition.charAt(0).toUpperCase() + partition.slice(1)}\n\n`;
            for (const item of items) {
                md += `### ${item.title}\n`;
                md += `*Score: ${item.score} | Status: ${item.status} | Created: ${item.created_at}*\n\n`;
                md += `${item.content}\n\n`;
                if (item.tags.length > 0) {
                    md += `Tags: ${item.tags.join(', ')}\n\n`;
                }
            }
        }
        return md;
    }
    async exportAllSidecars(outputDir) {
        const db = this.getDb();
        const result = db.exec('SELECT DISTINCT agent_id FROM memory_entries');
        if (!result.length)
            return;
        const agents = result[0].values.map((row) => row[0]);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        for (const agent of agents) {
            const md = await this.exportAgentSidecar(agent);
            const filePath = path.join(outputDir, `${agent}-sidecar`, 'decision-log.md');
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, md, 'utf-8');
        }
    }
    // Stats
    async getStats() {
        const db = this.getDb();
        const totalResult = db.exec('SELECT COUNT(*) FROM memory_entries');
        const total_entries = totalResult[0]?.values[0]?.[0] || 0;
        const partitionResult = db.exec('SELECT partition, COUNT(*) FROM memory_entries GROUP BY partition');
        const by_partition = {};
        if (partitionResult.length) {
            for (const row of partitionResult[0].values) {
                by_partition[row[0]] = row[1];
            }
        }
        const agentResult = db.exec('SELECT agent_id, COUNT(*) FROM memory_entries GROUP BY agent_id');
        const by_agent = {};
        if (agentResult.length) {
            for (const row of agentResult[0].values) {
                by_agent[row[0]] = row[1];
            }
        }
        const staleResult = db.exec("SELECT COUNT(*) FROM memory_entries WHERE status = 'stale'");
        const stale_count = staleResult[0]?.values[0]?.[0] || 0;
        const expiredResult = db.exec("SELECT COUNT(*) FROM memory_entries WHERE expires_at < datetime('now') AND status = 'active'");
        const expired_count = expiredResult[0]?.values[0]?.[0] || 0;
        return { total_entries, by_partition, by_agent, stale_count, expired_count };
    }
    // Persistence
    /**
     * Flush pending changes to disk. Used by BudgetTracker and other modules
     * that write directly to the database via getDatabase().
     */
    flush() {
        this.save();
    }
    // Database access for other modules
    getDatabase() {
        return this.getDb();
    }
    // Close
    async close() {
        if (this.db) {
            this.save();
            this.db.close();
            this.db = null;
        }
    }
    // Internal helpers
    rowToEntry(columns, row) {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
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
            last_used_at: obj.last_used_at,
            status: obj.status,
            ttl_days: obj.ttl_days,
            created_at: obj.created_at,
            updated_at: obj.updated_at,
            expires_at: obj.expires_at,
            source_workflow: obj.source_workflow,
            source_story: obj.source_story,
            source_session: obj.source_session,
        };
    }
}
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=memory-manager.js.map