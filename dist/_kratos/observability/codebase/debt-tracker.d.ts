interface DebtItem {
    file: string;
    category: 'complexity' | 'size' | 'test-gap' | 'duplication' | 'todo';
    severity: 'low' | 'medium' | 'high';
    description: string;
    value?: number;
}
export interface DebtReport {
    total_items: number;
    by_severity: Record<string, number>;
    by_category: Record<string, number>;
    debt_score: number;
    items: DebtItem[];
    hotspots: {
        file: string;
        issues: number;
    }[];
}
export declare class DebtTracker {
    private projectRoot;
    constructor(projectRoot: string);
    /**
     * Scan for technical debt.
     */
    analyze(): DebtReport;
    /**
     * Format debt report for console display.
     */
    formatReport(report: DebtReport): string;
    private getSourceFiles;
    private countComplexity;
    private findLongFunctions;
    private isSourceFile;
    private hasTestFile;
}
export {};
