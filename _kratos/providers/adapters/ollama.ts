// Kratos Provider Adapter — Ollama (Local)
// Uses native fetch() — no npm dependency required.

import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse } from '../provider-interface';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private _available = false;
  private baseUrl = 'http://localhost:11434';
  private config: LLMProviderConfig | null = null;

  get available(): boolean { return this._available; }

  async init(config: LLMProviderConfig): Promise<boolean> {
    this.config = config;

    if (!config.enabled) return false;

    this.baseUrl = config.base_url || 'http://localhost:11434';

    // Check if Ollama is reachable
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      this._available = response.ok;
      return this._available;
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
    if (!this.config) throw new Error('Ollama provider not initialized');

    const model = opts?.model || this.config.default_model;
    const start = Date.now();

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          num_predict: opts?.max_tokens || this.config.max_tokens,
          temperature: opts?.temperature,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      message: { content: string };
      model: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };

    const duration_ms = Date.now() - start;

    return {
      content: data.message.content,
      model: data.model,
      provider: this.name,
      usage: {
        input_tokens: data.prompt_eval_count || 0,
        output_tokens: data.eval_count || 0,
      },
      duration_ms,
      cost_estimate: 0, // Local = free
    };
  }

  async test(): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ok: true, latency_ms: Date.now() - start };
    } catch (err) {
      return { ok: false, latency_ms: Date.now() - start, error: String(err) };
    }
  }

  estimateCost(_inputTokens: number, _outputTokens: number, _modelTier: string): number {
    return 0; // Local inference is free
  }
}
