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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidecarMigration = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SidecarMigration {
    manager;
    sidecarDir;
    constructor(memoryManager, sidecarDir) {
        this.manager = memoryManager;
        this.sidecarDir = sidecarDir;
    }
    async discoverSidecars() {
        if (!fs.existsSync(this.sidecarDir))
            return [];
        const entries = fs.readdirSync(this.sidecarDir, { withFileTypes: true });
        return entries
            .filter(e => e.isDirectory() && e.name.endsWith('-sidecar'))
            .map(e => e.name);
    }
    async parseSidecar(agentId, filePath) {
        if (!fs.existsSync(filePath))
            return [];
        const content = fs.readFileSync(filePath, 'utf-8');
        const entries = [];
        const lines = content.split('\n');
        let currentTitle = '';
        let currentContent = [];
        let currentPartition = 'decisions';
        const flush = () => {
            if (currentTitle && currentContent.length > 0) {
                entries.push({
                    partition: currentPartition,
                    agent_id: agentId,
                    access_level: 'agent-private',
                    title: currentTitle,
                    content: currentContent.join('\n').trim(),
                    tags: [],
                    metadata: { migrated_from: filePath },
                    score: 0.5,
                    status: 'active',
                    ttl_days: 90,
                });
            }
        };
        for (const line of lines) {
            const h2Match = line.match(/^##\s+(.+)/);
            const h3Match = line.match(/^###\s+(.+)/);
            if (h2Match || h3Match) {
                flush();
                currentTitle = (h2Match || h3Match)[1].trim();
                currentContent = [];
                currentPartition = this.classifyHeading(currentTitle);
            }
            else if (currentTitle) {
                currentContent.push(line);
            }
        }
        flush();
        return entries;
    }
    async migrate() {
        const sidecars = await this.discoverSidecars();
        let agents_migrated = 0;
        let entries_imported = 0;
        const errors = [];
        for (const sidecarDir of sidecars) {
            const agentId = sidecarDir.replace('-sidecar', '');
            const sidecarPath = path.join(this.sidecarDir, sidecarDir);
            try {
                const files = fs.readdirSync(sidecarPath).filter(f => f.endsWith('.md'));
                if (files.length === 0)
                    continue;
                let agentHadEntries = false;
                for (const file of files) {
                    const filePath = path.join(sidecarPath, file);
                    const entries = await this.parseSidecar(agentId, filePath);
                    for (const entry of entries) {
                        try {
                            await this.manager.store(entry);
                            entries_imported++;
                            agentHadEntries = true;
                        }
                        catch (err) {
                            errors.push(`Failed to store entry "${entry.title}" for ${agentId}: ${err}`);
                        }
                    }
                }
                if (agentHadEntries)
                    agents_migrated++;
            }
            catch (err) {
                errors.push(`Failed to process sidecar for ${agentId}: ${err}`);
            }
        }
        return { agents_migrated, entries_imported, errors };
    }
    classifyHeading(heading) {
        const lower = heading.toLowerCase();
        if (lower.includes('decision:') || lower.includes('decided'))
            return 'decisions';
        if (lower.includes('pattern:'))
            return 'patterns';
        if (lower.includes('anti-pattern:') || lower.includes('antipattern'))
            return 'anti-patterns';
        if (lower.includes('fact:') || lower.includes('finding:'))
            return 'facts';
        if (lower.includes('context:'))
            return 'context';
        return 'decisions';
    }
}
exports.SidecarMigration = SidecarMigration;
//# sourceMappingURL=migration.js.map