import { Checkpoint } from './checkpoint-manager';
export interface GateResult {
    gate_name: string;
    passed: boolean;
    reason?: string;
    checked_at: string;
}
export declare class GateChecker {
    checkPreStart(workflowConfig: Record<string, unknown>): Promise<GateResult[]>;
    checkPostComplete(workflowConfig: Record<string, unknown>, checkpoint: Checkpoint): Promise<GateResult[]>;
    checkReviewGates(storyFilePath: string): Promise<{
        all_passed: boolean;
        gates: Record<string, 'PASSED' | 'FAILED' | 'PENDING'>;
    }>;
    formatResults(results: GateResult[]): string;
    private evaluateGate;
}
