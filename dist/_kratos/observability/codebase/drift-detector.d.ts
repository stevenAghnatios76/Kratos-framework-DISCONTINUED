interface DriftItem {
    claim: string;
    source_file: string;
    status: 'valid' | 'drifted' | 'unknown';
    detail: string;
}
export interface DriftReport {
    total_claims: number;
    valid: number;
    drifted: number;
    unknown: number;
    drift_score: number;
    items: DriftItem[];
}
export declare class DriftDetector {
    private projectRoot;
    constructor(projectRoot: string);
    /**
     * Detect drift between architecture docs and actual codebase.
     */
    detect(): DriftReport;
    /**
     * Format drift report for console display.
     */
    formatReport(report: DriftReport): string;
    private extractClaims;
    private extractDirectoryClaims;
    private checkPackageDeps;
    private checkTechExists;
}
export {};
