"use strict";
// Kratos Skill Section Indexer
// Indexes skill files by their H2 sections for sectioned JIT loading.
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
exports.SkillIndex = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SkillIndex {
    skillsDir;
    cacheDir;
    constructor(skillsDir, cacheDir) {
        this.skillsDir = skillsDir;
        this.cacheDir = cacheDir;
    }
    /**
     * Build index of all skill files and their sections.
     */
    build() {
        const skills = [];
        if (!fs.existsSync(this.skillsDir)) {
            return { skills, total_skills: 0, total_sections: 0, indexed_at: new Date().toISOString() };
        }
        const files = fs.readdirSync(this.skillsDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
            const filePath = path.join(this.skillsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const sections = this.extractSections(lines);
            const skillName = path.basename(file, '.md');
            skills.push({
                skill_name: skillName,
                file_path: filePath,
                total_lines: lines.length,
                sections,
                indexed_at: new Date().toISOString(),
            });
        }
        const total_sections = skills.reduce((s, sk) => s + sk.sections.length, 0);
        const index = {
            skills,
            total_skills: skills.length,
            total_sections,
            indexed_at: new Date().toISOString(),
        };
        this.saveIndex(index);
        return index;
    }
    /**
     * Load cached index if available.
     */
    loadCached() {
        const indexPath = path.join(this.cacheDir, 'skill-index.json');
        if (!fs.existsSync(indexPath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        }
        catch {
            return null;
        }
    }
    /**
     * Get a specific section from a skill.
     */
    getSection(skillName, sectionHeading) {
        const index = this.loadCached() || this.build();
        const skill = index.skills.find(s => s.skill_name === skillName);
        if (!skill)
            return null;
        const section = skill.sections.find(s => s.heading.toLowerCase() === sectionHeading.toLowerCase());
        if (!section)
            return null;
        const content = fs.readFileSync(skill.file_path, 'utf-8');
        const lines = content.split('\n');
        return lines.slice(section.start_line, section.end_line).join('\n');
    }
    /**
     * List all sections for a skill.
     */
    listSections(skillName) {
        const index = this.loadCached() || this.build();
        const skill = index.skills.find(s => s.skill_name === skillName);
        return skill?.sections || [];
    }
    /**
     * Estimate token count for a section (rough: 1 token ~ 4 chars).
     */
    estimateTokens(lineCount) {
        return Math.round(lineCount * 40 / 4); // ~40 chars per line average
    }
    /**
     * Format index for console display.
     */
    formatIndex(index) {
        const lines = [
            'Skill Section Index',
            '='.repeat(50),
            '',
            `Total skills:    ${index.total_skills}`,
            `Total sections:  ${index.total_sections}`,
            `Indexed at:      ${index.indexed_at}`,
            '',
        ];
        for (const skill of index.skills) {
            lines.push(`${skill.skill_name} (${skill.total_lines} lines, ${skill.sections.length} sections):`);
            for (const section of skill.sections) {
                const tokens = this.estimateTokens(section.line_count);
                lines.push(`  - ${section.heading} (${section.line_count} lines, ~${tokens} tokens)`);
            }
            lines.push('');
        }
        return lines.join('\n');
    }
    extractSections(lines) {
        const sections = [];
        let currentHeading = '';
        let currentStart = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('## ')) {
                // Close previous section
                if (currentHeading) {
                    sections.push({
                        heading: currentHeading,
                        start_line: currentStart,
                        end_line: i,
                        line_count: i - currentStart,
                        content_hash: this.simpleHash(lines.slice(currentStart, i).join('\n')),
                    });
                }
                currentHeading = line.replace(/^##\s+/, '').trim();
                currentStart = i;
            }
        }
        // Close last section
        if (currentHeading) {
            sections.push({
                heading: currentHeading,
                start_line: currentStart,
                end_line: lines.length,
                line_count: lines.length - currentStart,
                content_hash: this.simpleHash(lines.slice(currentStart).join('\n')),
            });
        }
        return sections;
    }
    simpleHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
    saveIndex(index) {
        const indexPath = path.join(this.cacheDir, 'skill-index.json');
        const dir = path.dirname(indexPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }
}
exports.SkillIndex = SkillIndex;
//# sourceMappingURL=skill-index.js.map