// Kratos Provider Adapter — OpenAI
// Lazy-loads openai SDK. Falls back gracefully if not installed.

import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse } from '../provider-interface';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private _available = false;
  private client: unknown = null;
  private config: LLMProviderConfig | null = null;

  get available(): boolean { return this._available; }

  async init(config: LLMProviderConfig): Promise<boolean> {
    this.config = config;

    if (!config.enabled) return false;

    const apiKey = process.env[config.api_key_env || 'OPENAI_API_KEY'];
    if (!apiKey) {
      this._available = false;
      return false;
    }

    try {
      const sdk = await import('openai');
      const OpenAI = sdk.default || sdk.OpenAI;
      this.client = new OpenAI({ apiKey });
      this._available = true;
      return true;
    } catch {
      this._available = false;
      return false;
    }
  }

  async complete(messages: LLMMessage[], opts?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    if (!this.client || !this.config) throw new Error('OpenAI provider not initialized');

    const model = opts?.model || this.config.default_model;
    const maxTokens = opts?.max_tokens || this.config.max_tokens;
    const start = Date.now();

    const client = this.client as {
      chat: { completions: { create: (opts: unknown) => Promise<unknown> } }
    };

    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: opts?.temperature,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }) as {
      choices: { message: { content: string } }[];
      model: string;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const duration_ms = Date.now() - start;

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      provider: this.name,
      usage: {
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens,
      },
      duration_ms,
      cost_estimate: this.estimateCost(
        response.usage.prompt_tokens,
        response.usage.completion_tokens,
        this.getModelTier(model)
      ),
    };
  }

  async test(): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
    const start = Date.now();
    try {
      await this.complete([{ role: 'user', content: 'Reply with OK' }], {
        max_tokens: 10,
        temperature: 0,
      });
      return { ok: true, latency_ms: Date.now() - start };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - start, error: String(err) };
    }
  }

  estimateCost(inputTokens: number, outputTokens: number, modelTier: string): number {
    if (!this.config) return 0;
    const inputRate = this.config.cost_per_1k_input[modelTier] || 0;
    const outputRate = this.config.cost_per_1k_output[modelTier] || 0;
    return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
  }

  private getModelTier(model: string): string {
    if (!this.config) return 'standard';
    for (const [tier, name] of Object.entries(this.config.models)) {
      if (name === model) return tier;
    }
    return 'standard';
  }
}
