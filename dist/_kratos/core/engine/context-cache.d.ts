interface CachedContext {
    agent_id: string;
    persona_lines: number;
    skill_sections: {
        skill: string;
        section: string;
        lines: number;
    }[];
    total_lines: number;
    estimated_tokens: number;
    built_at: string;
}
interface ContextStats {
    agents_cached: number;
    skills_indexed: number;
    total_cached_tokens: number;
    budget_max: number;
    budget_used_pct: number;
    cache_age_hours: number;
    savings_estimate: {
        without_cache_tokens: number;
        with_cache_tokens: number;
        savings_pct: number;
    };
}
export declare class ContextCache {
    private kratosRoot;
    private cacheDir;
    private skillIndex;
    private budgetMax;
    constructor(kratosRoot: string, budgetMax?: number);
    /**
     * Build pre-compiled context caches for all agents.
     */
    buildAll(): CachedContext[];
    /**
     * Build context cache for a single agent.
     */
    buildAgentContext(agentId: string, personaPath: string): CachedContext | null;
    /**
     * Get context stats for display.
     */
    getStats(): ContextStats;
    /**
     * Invalidate all caches.
     */
    invalidate(): number;
    /**
     * Check if an agent's context fits within budget.
     */
    checkBudget(agentId: string): {
        fits: boolean;
        tokens: number;
        budget: number;
        overage: number;
    };
    /**
     * Format stats for console display.
     */
    formatStats(stats: ContextStats): string;
    private extractSkillReferences;
    private estimateTokens;
    private estimateFullFileTokens;
    private saveCacheManifest;
    private loadCacheManifest;
}
export {};
