import type { ComplexityTier, ModelTier } from './provider-interface';
interface RoutingDecision {
    workflow: string;
    complexity_score: number;
    tier: ComplexityTier;
    model_tier: ModelTier | null;
    reasoning: string;
}
export declare class CostRouter {
    /**
     * Score a workflow's complexity and determine routing tier.
     */
    route(workflow: string, context?: {
        description?: string;
        file_count?: number;
        story_points?: number;
    }): RoutingDecision;
    /**
     * Get all known workflow base scores.
     */
    getWorkflowScores(): Record<string, number>;
    /**
     * Format a routing decision for display.
     */
    formatDecision(decision: RoutingDecision): string;
    private scoreToTier;
}
export {};
