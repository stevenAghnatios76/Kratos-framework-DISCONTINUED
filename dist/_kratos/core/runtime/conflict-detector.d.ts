import { WorkerResult } from './worker';
import { StoryNode } from './dependency-graph';
export interface FileConflict {
    file_path: string;
    stories: string[];
    type: 'concurrent-edit' | 'delete-edit' | 'create-create';
    severity: 'critical' | 'warning';
}
export declare class ConflictDetector {
    detect(results: WorkerResult[]): Promise<FileConflict[]>;
    estimateConflicts(stories: StoryNode[]): Promise<FileConflict[]>;
    formatForReview(conflicts: FileConflict[]): string;
}
