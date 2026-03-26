// Kratos Cost Router
// Complexity scoring (0-100) that determines which LLM tier to use.

import type { ComplexityTier, ModelTier } from './provider-interface';

interface RoutingDecision {
  workflow: string;
  complexity_score: number;
  tier: ComplexityTier;
  model_tier: ModelTier | null;
  reasoning: string;
}

// Base complexity scores for known workflows
const WORKFLOW_BASE_SCORES: Record<string, number> = {
  // No LLM needed (0-10)
  'sprint-status': 0,
  'build-configs': 0,
  'memory-hygiene': 5,
  'changelog': 5,
  'epic-status': 5,
  'validate-framework': 8,

  // Fast tier (11-30)
  'summarize': 15,
  'index-docs': 15,
  'shard-doc': 18,
  'merge-docs': 18,
  'validate-story': 20,
  'fix-story': 22,
  'editorial-prose': 25,
  'editorial-structure': 25,

  // Standard tier (31-70)
  'quick-spec': 35,
  'quick-dev': 40,
  'code-review': 42,
  'test-review': 42,
  'qa-tests': 45,
  'test-automate': 45,
  'security-review': 50,
  'performance-review': 50,
  'review-api': 50,
  'review-deps': 45,
  'dev-story': 55,
  'create-story': 50,
  'sprint-plan': 55,
  'atdd': 55,
  'test-design': 55,
  'ci-setup': 50,
  'deploy-checklist': 50,

  // Deep reasoning tier (71-100)
  'create-arch': 80,
  'create-prd': 75,
  'create-ux': 72,
  'create-epics': 75,
  'brainstorm': 78,
  'market-research': 80,
  'domain-research': 78,
  'tech-research': 78,
  'threat-model': 82,
  'innovation': 85,
  'design-thinking': 80,
  'creative-sprint': 85,
  'problem-solving': 80,
  'nfr': 72,
  'infra-design': 78,
  'brownfield': 85,
  'adversarial': 90,
  'advanced-elicitation': 88,
};

// Keyword modifiers (additive)
const KEYWORD_MODIFIERS: Record<string, number> = {
  'architecture': 15,
  'security': 10,
  'performance': 8,
  'migration': 12,
  'refactor': 8,
  'integration': 10,
  'multi-service': 12,
  'distributed': 15,
  'real-time': 10,
  'compliance': 10,
};

export class CostRouter {
  /**
   * Score a workflow's complexity and determine routing tier.
   */
  route(workflow: string, context?: {
    description?: string;
    file_count?: number;
    story_points?: number;
  }): RoutingDecision {
    let score = WORKFLOW_BASE_SCORES[workflow] ?? 50;
    const reasons: string[] = [`Base score for '${workflow}': ${score}`];

    // Apply keyword modifiers from description
    if (context?.description) {
      const descLower = context.description.toLowerCase();
      for (const [keyword, modifier] of Object.entries(KEYWORD_MODIFIERS)) {
        if (descLower.includes(keyword)) {
          score += modifier;
          reasons.push(`+${modifier} for keyword '${keyword}'`);
        }
      }
    }

    // File count modifier
    if (context?.file_count) {
      if (context.file_count > 20) {
        score += 10;
        reasons.push(`+10 for high file count (${context.file_count})`);
      } else if (context.file_count > 10) {
        score += 5;
        reasons.push(`+5 for moderate file count (${context.file_count})`);
      }
    }

    // Story points modifier
    if (context?.story_points) {
      if (context.story_points >= 8) {
        score += 10;
        reasons.push(`+10 for high story points (${context.story_points})`);
      } else if (context.story_points >= 5) {
        score += 5;
        reasons.push(`+5 for moderate story points (${context.story_points})`);
      }
    }

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    const tier = this.scoreToTier(score);
    const modelTier = tier === 'no_llm' ? null : tier as ModelTier;

    return {
      workflow,
      complexity_score: score,
      tier,
      model_tier: modelTier,
      reasoning: reasons.join('; '),
    };
  }

  /**
   * Get all known workflow base scores.
   */
  getWorkflowScores(): Record<string, number> {
    return { ...WORKFLOW_BASE_SCORES };
  }

  /**
   * Format a routing decision for display.
   */
  formatDecision(decision: RoutingDecision): string {
    const tierLabels: Record<string, string> = {
      no_llm: 'Tier 0 / no-llm / No LLM needed',
      fast: 'Tier 1 / fast / Haiku-class',
      standard: 'Tier 2 / standard / Sonnet-class',
      deep_reasoning: 'Tier 3 / deep-reasoning / Opus-class',
    };

    return [
      `Workflow:    ${decision.workflow}`,
      `Score:       ${decision.complexity_score}/100`,
      `Routing:     ${tierLabels[decision.tier] || decision.tier}`,
      `Reasoning:   ${decision.reasoning}`,
    ].join('\n');
  }

  private scoreToTier(score: number): ComplexityTier {
    if (score <= 10) return 'no_llm';
    if (score <= 30) return 'fast';
    if (score <= 70) return 'standard';
    return 'deep_reasoning';
  }
}
