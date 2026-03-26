export interface HookDefinition {
    command: string;
    on_fail: 'halt' | 'warn' | 'skip';
    timeout?: number;
    condition?: string;
    env?: Record<string, string>;
}
export interface HookContext {
    workflow_name?: string;
    step_number?: number;
    gate_name?: string;
    gate_result?: string;
    review_type?: string;
    review_result?: string;
    agent_id?: string;
    story_key?: string;
    error_message?: string;
    files_modified?: string[];
    score?: number;
    [key: string]: unknown;
}
export interface HookResult {
    hook_point: string;
    command: string;
    exit_code: number;
    stdout: string;
    stderr: string;
    duration_ms: number;
    action_taken: 'continued' | 'warned' | 'halted';
}
export declare class HaltError extends Error {
    constructor(hookPoint: string, command: string, stderr: string);
}
export declare class HookExecutor {
    private hooks;
    private configPath;
    constructor(hooksConfigPath: string);
    loadConfig(): Promise<void>;
    execute(hookPoint: string, context: HookContext): Promise<HookResult[]>;
    private resolveCommand;
    private evaluateCondition;
    addHook(hookPoint: string, hook: HookDefinition): void;
    removeHook(hookPoint: string, index: number): void;
    listHooks(): Record<string, HookDefinition[]>;
}
