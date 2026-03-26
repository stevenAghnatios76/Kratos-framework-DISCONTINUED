interface SkillSection {
    heading: string;
    start_line: number;
    end_line: number;
    line_count: number;
    content_hash: string;
}
interface SkillIndexEntry {
    skill_name: string;
    file_path: string;
    total_lines: number;
    sections: SkillSection[];
    indexed_at: string;
}
export interface SkillIndexData {
    skills: SkillIndexEntry[];
    total_skills: number;
    total_sections: number;
    indexed_at: string;
}
export declare class SkillIndex {
    private skillsDir;
    private cacheDir;
    constructor(skillsDir: string, cacheDir: string);
    /**
     * Build index of all skill files and their sections.
     */
    build(): SkillIndexData;
    /**
     * Load cached index if available.
     */
    loadCached(): SkillIndexData | null;
    /**
     * Get a specific section from a skill.
     */
    getSection(skillName: string, sectionHeading: string): string | null;
    /**
     * List all sections for a skill.
     */
    listSections(skillName: string): SkillSection[];
    /**
     * Estimate token count for a section (rough: 1 token ~ 4 chars).
     */
    estimateTokens(lineCount: number): number;
    /**
     * Format index for console display.
     */
    formatIndex(index: SkillIndexData): string;
    private extractSections;
    private simpleHash;
    private saveIndex;
}
export {};
