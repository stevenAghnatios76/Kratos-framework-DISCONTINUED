export interface StoryNode {
    story_key: string;
    status: string;
    depends_on: string[];
    blocks: string[];
    files_touched: string[];
    assigned_agent?: string;
}
export interface ExecutionPlan {
    waves: StoryNode[][];
    total_stories: number;
    parallelizable: number;
    sequential: number;
    blocked: string[];
}
export declare class DependencyGraph {
    private nodes;
    buildFromSprint(sprintStatusPath: string): Promise<void>;
    addNode(node: StoryNode): void;
    getReady(): StoryNode[];
    getBlocked(): StoryNode[];
    generatePlan(): ExecutionPlan;
    canRunInParallel(storyA: string, storyB: string): boolean;
    markComplete(storyKey: string): string[];
    toText(): string;
}
