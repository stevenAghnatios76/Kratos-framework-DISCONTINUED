interface OwnershipEntry {
    file: string;
    stories: string[];
    agents: string[];
    last_workflow: string;
    last_modified: string;
}
export interface OwnershipReport {
    total_files: number;
    total_entries: number;
    by_agent: Record<string, number>;
    by_story: Record<string, number>;
    entries: OwnershipEntry[];
    hotspots: {
        file: string;
        touch_count: number;
    }[];
}
export declare class OwnershipMap {
    private checkpointDir;
    constructor(checkpointDir: string);
    /**
     * Build ownership map from checkpoint files_touched data.
     */
    build(): OwnershipReport;
    /**
     * Look up ownership for a specific file.
     */
    lookupFile(filePath: string): OwnershipEntry | null;
    /**
     * Format ownership report for console display.
     */
    formatReport(report: OwnershipReport): string;
    private loadCheckpoints;
}
export {};
