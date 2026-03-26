// Kratos Provider Adapter — Google (Gemini)
// Lazy-loads @google/generative-ai SDK. Falls back gracefully if not installed.

import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse } from '../provider-interface';

export class GoogleProvider implements LLMProvider {
  readonly name = 'google';
  private _available = false;
  private client: unknown = null;
  private config: LLMProviderConfig | null = null;

  get available(): boolean { return this._available; }

  async init(config: LLMProviderConfig): Promise<boolean> {
    this.config = config;

    if (!config.enabled) return false;

    const apiKey = process.env[config.api_key_env || 'GOOGLE_AI_API_KEY'];
    if (!apiKey) {
      this._available = false;
      return false;
    }

    try {
      const sdk = await import('@google/generative-ai');
      const GoogleGenerativeAI = sdk.GoogleGenerativeAI;
      this.client = new GoogleGenerativeAI(apiKey);
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
    if (!this.client || !this.config) throw new Error('Google provider not initialized');

    const modelName = opts?.model || this.config.default_model;
    const start = Date.now();

    const genAI = this.client as { getGenerativeModel: (opts: unknown) => unknown };
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: opts?.max_tokens || this.config.max_tokens,
        temperature: opts?.temperature,
      },
    }) as {
      generateContent: (opts: unknown) => Promise<{
        response: {
          text: () => string;
          usageMetadata?: {
            promptTokenCount: number;
            candidatesTokenCount: number;
          };
        };
      }>;
    };

    // Build contents from messages
    const systemMsg = messages.find(m => m.role === 'system');
    const conversationParts = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Prepend system instruction to first user message if present
    if (systemMsg && conversationParts.length > 0 && conversationParts[0].role === 'user') {
      conversationParts[0].parts[0].text = `${systemMsg.content}\n\n${conversationParts[0].parts[0].text}`;
    }

    const result = await model.generateContent({
      contents: conversationParts,
    });

    const duration_ms = Date.now() - start;
    const text = result.response.text();
    const usage = result.response.usageMetadata;

    return {
      content: text,
      model: modelName,
      provider: this.name,
      usage: {
        input_tokens: usage?.promptTokenCount || 0,
        output_tokens: usage?.candidatesTokenCount || 0,
      },
      duration_ms,
      cost_estimate: this.estimateCost(
        usage?.promptTokenCount || 0,
        usage?.candidatesTokenCount || 0,
        this.getModelTier(modelName)
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
