// Kratos Provider Interface
// Defines the contract all LLM providers must implement.

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  duration_ms: number;
  cost_estimate?: number;
}

export interface LLMProviderConfig {
  name: string;
  enabled: boolean;
  api_key_env?: string;
  base_url?: string;
  models: {
    fast: string;
    standard: string;
    deep_reasoning: string;
  };
  default_model: string;
  max_tokens: number;
  tier: 'primary' | 'secondary' | 'local';
  cost_per_1k_input: Record<string, number>;
  cost_per_1k_output: Record<string, number>;
}

export interface LLMProvider {
  readonly name: string;
  readonly available: boolean;

  /**
   * Initialize the provider. Returns true if ready, false if SDK missing or config invalid.
   */
  init(config: LLMProviderConfig): Promise<boolean>;

  /**
   * Send a completion request.
   */
  complete(messages: LLMMessage[], opts?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<LLMResponse>;

  /**
   * Test connectivity with a simple prompt.
   */
  test(): Promise<{ ok: boolean; latency_ms: number; error?: string }>;

  /**
   * Estimate cost for a given token count.
   */
  estimateCost(inputTokens: number, outputTokens: number, modelTier: string): number;
}

export type ModelTier = 'fast' | 'standard' | 'deep_reasoning';
export type ComplexityTier = 'no_llm' | 'fast' | 'standard' | 'deep_reasoning';
