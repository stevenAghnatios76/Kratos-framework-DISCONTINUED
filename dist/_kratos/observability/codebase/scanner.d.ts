import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
interface FileInfo {
    path: string;
    size: number;
    lines: number;
    checksum: string;
    language: string;
    imports: string[];
    last_modified: string;
}
interface ScanResult {
    total_files: number;
    changed_files: number;
    new_files: number;
    deleted_files: number;
    files: FileInfo[];
    by_language: Record<string, number>;
    total_lines: number;
    scan_duration_ms: number;
}
export declare class CodebaseScanner {
    private projectRoot;
    private collector;
    private checksumCache;
    constructor(manager: MemoryManager, projectRoot: string);
    /**
     * Run incremental scan using git diff for change detection.
     */
    scan(): ScanResult;
    /**
     * Get stats summary without full file list.
     */
    getStats(): {
        total_files: number;
        total_lines: number;
        by_language: Record<string, number>;
    };
    /**
     * Format scan result for console display.
     */
    formatReport(result: ScanResult): string;
    private getChangedFiles;
    private getAllTrackedFiles;
    private computeChecksum;
    private extractImports;
    private loadChecksumCache;
    private saveChecksumCache;
}
export {};
