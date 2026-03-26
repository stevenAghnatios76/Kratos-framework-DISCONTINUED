"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForgettingShield = void 0;
class ForgettingShield {
    db;
    constructor(db) {
        this.db = db;
    }
    async protectHighValuePatterns(opts) {
        const minScore = opts?.min_score || 0.85;
        const minFrequency = opts?.min_frequency || 5;
        const database = this.db.getDatabase();
        const result = database.exec(`SELECT id, metadata FROM memory_entries
       WHERE partition IN ('patterns', 'decisions')
       AND status = 'active'
       AND score >= ?
       AND use_count >= ?
       AND (metadata NOT LIKE '%"protected":true%' OR metadata IS NULL)`, [minScore, minFrequency]);
        if (!result.length)
            return 0;
        let protectedCount = 0;
        const now = new Date().toISOString();
        for (const row of result[0].values) {
            const id = row[0];
            const existingMetadata = JSON.parse(row[1] || '{}');
            const metadata = {
                ...existingMetadata,
                protected: true,
                protected_at: now,
            };
            database.run(`UPDATE memory_entries SET ttl_days = 9999, expires_at = NULL, status = 'active', metadata = ?, updated_at = datetime('now') WHERE id = ?`, [JSON.stringify(metadata), id]);
            protectedCount++;
        }
        return protectedCount;
    }
    async reviewProtections() {
        const database = this.db.getDatabase();
        const cutoff = new Date(Date.now() - 180 * 86400000).toISOString();
        const result = database.exec(`SELECT id, metadata, ttl_days FROM memory_entries
       WHERE metadata LIKE '%"protected":true%'
       AND (last_used_at IS NULL OR last_used_at < ?)`, [cutoff]);
        if (!result.length)
            return 0;
        let unprotectedCount = 0;
        for (const row of result[0].values) {
            const id = row[0];
            const existingMetadata = JSON.parse(row[1] || '{}');
            delete existingMetadata.protected;
            delete existingMetadata.protected_at;
            const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString();
            database.run(`UPDATE memory_entries SET ttl_days = 90, expires_at = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?`, [expiresAt, JSON.stringify(existingMetadata), id]);
            unprotectedCount++;
        }
        return unprotectedCount;
    }
    async runProtectionCycle() {
        const newly_protected = await this.protectHighValuePatterns();
        const unprotected = await this.reviewProtections();
        const database = this.db.getDatabase();
        const result = database.exec(`SELECT COUNT(*) FROM memory_entries WHERE metadata LIKE '%"protected":true%'`);
        const total_protected = result[0]?.values[0]?.[0] || 0;
        return { newly_protected, unprotected, total_protected };
    }
}
exports.ForgettingShield = ForgettingShield;
//# sourceMappingURL=forgetting-shield.js.map