"use strict";
// Kratos Context Cache
// Pre-compiled agent contexts, budget calculation, and summarization.
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
exports.ContextCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const skill_index_js_1 = require("./skill-index.js");
class ContextCache {
    kratosRoot;
    cacheDir;
    skillIndex;
    budgetMax;
    constructor(kratosRoot, budgetMax = 40000) {
        this.kratosRoot = kratosRoot;
        this.cacheDir = path.join(kratosRoot, '.cache');
        this.budgetMax = budgetMax;
        const skillsDir = path.join(kratosRoot, 'dev', 'skills');
        const skillsCacheDir = path.join(this.cacheDir, 'skills');
        this.skillIndex = new skill_index_js_1.SkillIndex(skillsDir, skillsCacheDir);
    }
    /**
     * Build pre-compiled context caches for all agents.
     */
    buildAll() {
        const contexts = [];
        // Build skill index first
        this.skillIndex.build();
        // Find all agent persona files
        const agentDirs = [
            path.join(this.kratosRoot, 'dev', 'agents'),
            path.join(this.kratosRoot, 'lifecycle', 'agents'),
            path.join(this.kratosRoot, 'creative', 'agents'),
            path.join(this.kratosRoot, 'testing', 'agents'),
        ];
        for (const dir of agentDirs) {
            if (!fs.existsSync(dir))
                continue;
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
            for (const file of files) {
                const filePath = path.join(dir, file);
                const agentId = path.basename(file, '.md');
                const context = this.buildAgentContext(agentId, filePath);
                if (context)
                    contexts.push(context);
            }
        }
        // Save cache manifest
        this.saveCacheManifest(contexts);
        return contexts;
    }
    /**
     * Build context cache for a single agent.
     */
    buildAgentContext(agentId, personaPath) {
        if (!fs.existsSync(personaPath))
            return null;
        const personaContent = fs.readFileSync(personaPath, 'utf-8');
        const personaLines = personaContent.split('\n').length;
        // Parse agent file for skill references
        const skillRefs = this.extractSkillReferences(personaContent);
        const skillSections = [];
        for (const ref of skillRefs) {
            const sections = this.skillIndex.listSections(ref.skill);
            for (const section of sections) {
                if (!ref.sections || ref.sections.includes(section.heading.toLowerCase())) {
                    skillSections.push({
                        skill: ref.skill,
                        section: section.heading,
                        lines: section.line_count,
                    });
                }
            }
        }
        const totalSkillLines = skillSections.reduce((s, sec) => s + sec.lines, 0);
        const total_lines = personaLines + totalSkillLines;
        const estimated_tokens = this.estimateTokens(total_lines);
        const context = {
            agent_id: agentId,
            persona_lines: personaLines,
            skill_sections: skillSections,
            total_lines,
            estimated_tokens,
            built_at: new Date().toISOString(),
        };
        // Save individual agent cache
        const agentCachePath = path.join(this.cacheDir, 'agents', `${agentId}.json`);
        const dir = path.dirname(agentCachePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(agentCachePath, JSON.stringify(context, null, 2));
        return context;
    }
    /**
     * Get context stats for display.
     */
    getStats() {
        const manifest = this.loadCacheManifest();
        const skillIndexData = this.skillIndex.loadCached() || this.skillIndex.build();
        const agents_cached = manifest.length;
        const skills_indexed = skillIndexData.total_skills;
        const total_cached_tokens = manifest.reduce((s, c) => s + c.estimated_tokens, 0);
        // Calculate budget usage for largest agent
        const maxTokens = manifest.length > 0
            ? Math.max(...manifest.map(c => c.estimated_tokens))
            : 0;
        const budget_used_pct = this.budgetMax > 0 ? (maxTokens / this.budgetMax) * 100 : 0;
        // Cache age
        const newestBuild = manifest.length > 0
            ? Math.max(...manifest.map(c => new Date(c.built_at).getTime()))
            : Date.now();
        const cache_age_hours = (Date.now() - newestBuild) / 3600000;
        // Savings estimate: full files vs sectioned loading
        const fullFileTokens = this.estimateFullFileTokens();
        const sectionedTokens = total_cached_tokens;
        const savings_pct = fullFileTokens > 0
            ? ((fullFileTokens - sectionedTokens) / fullFileTokens) * 100
            : 0;
        return {
            agents_cached,
            skills_indexed,
            total_cached_tokens,
            budget_max: this.budgetMax,
            budget_used_pct,
            cache_age_hours,
            savings_estimate: {
                without_cache_tokens: fullFileTokens,
                with_cache_tokens: sectionedTokens,
                savings_pct,
            },
        };
    }
    /**
     * Invalidate all caches.
     */
    invalidate() {
        let count = 0;
        const dirs = ['agents', 'skills', 'configs'];
        for (const dir of dirs) {
            const dirPath = path.join(this.cacheDir, dir);
            if (!fs.existsSync(dirPath))
                continue;
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
            for (const file of files) {
                fs.unlinkSync(path.join(dirPath, file));
                count++;
            }
        }
        return count;
    }
    /**
     * Check if an agent's context fits within budget.
     */
    checkBudget(agentId) {
        const cachePath = path.join(this.cacheDir, 'agents', `${agentId}.json`);
        let tokens = 0;
        if (fs.existsSync(cachePath)) {
            const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
            tokens = cached.estimated_tokens;
        }
        const overage = Math.max(0, tokens - this.budgetMax);
        return { fits: tokens <= this.budgetMax, tokens, budget: this.budgetMax, overage };
    }
    /**
     * Format stats for console display.
     */
    formatStats(stats) {
        const lines = [
            'Context Cache Stats',
            '='.repeat(50),
            '',
            `Agents cached:       ${stats.agents_cached}`,
            `Skills indexed:      ${stats.skills_indexed}`,
            `Total cached tokens: ${stats.total_cached_tokens.toLocaleString()}`,
            `Budget max:          ${stats.budget_max.toLocaleString()} tokens`,
            `Budget used (max):   ${stats.budget_used_pct.toFixed(1)}%`,
            `Cache age:           ${stats.cache_age_hours.toFixed(1)} hours`,
            '',
            'Token Savings Estimate:',
            `  Without cache:  ${stats.savings_estimate.without_cache_tokens.toLocaleString()} tokens`,
            `  With cache:     ${stats.savings_estimate.with_cache_tokens.toLocaleString()} tokens`,
            `  Savings:        ${stats.savings_estimate.savings_pct.toFixed(1)}%`,
        ];
        return lines.join('\n');
    }
    extractSkillReferences(content) {
        const refs = [];
        // Look for skill references like: skill: git-workflow (section: Usage)
        const regex = /skill:\s*([\w-]+)(?:\s*\(section:\s*([^)]+)\))?/gi;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const skill = match[1];
            const sections = match[2]
                ? match[2].split(',').map(s => s.trim().toLowerCase())
                : undefined;
            refs.push({ skill, sections });
        }
        return refs;
    }
    estimateTokens(lineCount) {
        return Math.round(lineCount * 40 / 4); // ~40 chars per line, ~4 chars per token
    }
    estimateFullFileTokens() {
        let totalLines = 0;
        const dirs = [
            path.join(this.kratosRoot, 'dev', 'agents'),
            path.join(this.kratosRoot, 'dev', 'skills'),
        ];
        for (const dir of dirs) {
            if (!fs.existsSync(dir))
                continue;
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
            for (const file of files) {
                const content = fs.readFileSync(path.join(dir, file), 'utf-8');
                totalLines += content.split('\n').length;
            }
        }
        return this.estimateTokens(totalLines);
    }
    saveCacheManifest(contexts) {
        const manifestPath = path.join(this.cacheDir, 'manifest.json');
        if (!fs.existsSync(this.cacheDir))
            fs.mkdirSync(this.cacheDir, { recursive: true });
        fs.writeFileSync(manifestPath, JSON.stringify(contexts, null, 2));
    }
    loadCacheManifest() {
        const manifestPath = path.join(this.cacheDir, 'manifest.json');
        if (!fs.existsSync(manifestPath))
            return [];
        try {
            return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        }
        catch {
            return [];
        }
    }
}
exports.ContextCache = ContextCache;
//# sourceMappingURL=context-cache.js.map