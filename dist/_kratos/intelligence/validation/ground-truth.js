"use strict";
// Kratos Ground Truth Manager
// Stores verified facts in memory_entries table (partition='facts', agent_id='validator').
// Refreshes from filesystem to keep ground truth current.
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
exports.GroundTruth = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class GroundTruth {
    manager;
    projectRoot;
    lastRefresh = null;
    constructor(manager, projectRoot) {
        this.manager = manager;
        this.projectRoot = projectRoot;
    }
    /**
     * Refresh ground truth by scanning filesystem and package.json.
     */
    async refresh() {
        const facts = [];
        const categories = {};
        // Scan filesystem structure
        const filesFacts = this.scanDirectory(this.projectRoot, '', 3);
        facts.push(...filesFacts);
        // Scan package.json dependencies
        const pkgPath = path.join(this.projectRoot, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (pkg.dependencies) {
                for (const [name, version] of Object.entries(pkg.dependencies)) {
                    facts.push({
                        category: 'dependency',
                        key: `dep:${name}`,
                        value: `${name}@${version}`,
                        source: 'package.json:dependencies',
                    });
                }
            }
            if (pkg.devDependencies) {
                for (const [name, version] of Object.entries(pkg.devDependencies)) {
                    facts.push({
                        category: 'dependency',
                        key: `devDep:${name}`,
                        value: `${name}@${version}`,
                        source: 'package.json:devDependencies',
                    });
                }
            }
            if (pkg.optionalDependencies) {
                for (const [name, version] of Object.entries(pkg.optionalDependencies)) {
                    facts.push({
                        category: 'dependency',
                        key: `optDep:${name}`,
                        value: `${name}@${version}`,
                        source: 'package.json:optionalDependencies',
                    });
                }
            }
            // Store version and name as config facts
            if (pkg.version) {
                facts.push({ category: 'config', key: 'package:version', value: pkg.version, source: 'package.json' });
            }
            if (pkg.name) {
                facts.push({ category: 'config', key: 'package:name', value: pkg.name, source: 'package.json' });
            }
        }
        // Scan global.yaml for config facts
        const globalYamlPath = path.join(this.projectRoot, '_kratos', '_config', 'global.yaml');
        if (fs.existsSync(globalYamlPath)) {
            const yamlContent = fs.readFileSync(globalYamlPath, 'utf-8');
            const versionMatch = yamlContent.match(/framework_version:\s*"?([^"\n]+)"?/);
            if (versionMatch) {
                facts.push({ category: 'config', key: 'framework:version', value: versionMatch[1], source: 'global.yaml' });
            }
        }
        // Clear old ground truth entries
        const existing = await this.manager.query({
            partition: 'facts',
            agent_id: 'validator',
            status: 'active',
        });
        for (const entry of existing) {
            if (entry.id)
                await this.manager.delete(entry.id);
        }
        // Store new facts
        for (const fact of facts) {
            categories[fact.category] = (categories[fact.category] || 0) + 1;
            await this.manager.store({
                partition: 'facts',
                agent_id: 'validator',
                access_level: 'global',
                title: fact.key,
                content: fact.value,
                tags: [fact.category, 'ground-truth'],
                metadata: { category: fact.category, source: fact.source },
                score: 1.0,
                status: 'active',
                ttl_days: 1, // Ground truth expires daily — must be refreshed
            });
        }
        this.lastRefresh = new Date();
        return { facts_stored: facts.length, categories };
    }
    /**
     * Query ground truth facts.
     */
    async getFacts(category) {
        const entries = await this.manager.query({
            partition: 'facts',
            agent_id: 'validator',
            status: 'active',
            tags: category ? [category] : undefined,
        });
        return entries.map(e => ({
            category: (e.metadata.category || 'unknown'),
            key: e.title,
            value: e.content,
            source: e.metadata.source || 'unknown',
        }));
    }
    /**
     * Check if a specific file exists in ground truth.
     */
    async fileExists(filePath) {
        const normalizedPath = filePath.replace(/^\.\//, '');
        const fullPath = path.join(this.projectRoot, normalizedPath);
        return fs.existsSync(fullPath);
    }
    /**
     * Check if a dependency exists in ground truth.
     */
    async dependencyExists(name) {
        const entries = await this.manager.search(name, {
            partition: 'facts',
            agent_id: 'validator',
        });
        for (const entry of entries) {
            if (entry.title.endsWith(`:${name}`)) {
                const type = entry.title.split(':')[0];
                return { exists: true, version: entry.content, type };
            }
        }
        return { exists: false };
    }
    /**
     * Get last refresh timestamp.
     */
    getLastRefresh() {
        return this.lastRefresh;
    }
    scanDirectory(basePath, relativePath, maxDepth) {
        if (maxDepth <= 0)
            return [];
        const facts = [];
        const fullPath = path.join(basePath, relativePath);
        if (!fs.existsSync(fullPath))
            return facts;
        try {
            const entries = fs.readdirSync(fullPath, { withFileTypes: true });
            for (const entry of entries) {
                // Skip node_modules, .git, dist, hidden dirs
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
                    continue;
                }
                const entryRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    facts.push({
                        category: 'structure',
                        key: `dir:${entryRelative}`,
                        value: entryRelative,
                        source: 'filesystem',
                    });
                    facts.push(...this.scanDirectory(basePath, entryRelative, maxDepth - 1));
                }
                else if (entry.isFile()) {
                    facts.push({
                        category: 'file',
                        key: `file:${entryRelative}`,
                        value: entryRelative,
                        source: 'filesystem',
                    });
                }
            }
        }
        catch {
            // Permission denied or other read error — skip
        }
        return facts;
    }
}
exports.GroundTruth = GroundTruth;
//# sourceMappingURL=ground-truth.js.map