"use strict";
// Kratos Provider Adapter — Ollama (Local)
// Uses native fetch() — no npm dependency required.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
class OllamaProvider {
    name = 'ollama';
    _available = false;
    baseUrl = 'http://localhost:11434';
    config = null;
    get available() { return this._available; }
    async init(config) {
        this.config = config;
        if (!config.enabled)
            return false;
        this.baseUrl = config.base_url || 'http://localhost:11434';
        // Check if Ollama is reachable
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(3000),
            });
            this._available = response.ok;
            return this._available;
        }
        catch {
            this._available = false;
            return false;
        }
    }
    async complete(messages, opts) {
        if (!this.config)
            throw new Error('Ollama provider not initialized');
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
        const data = await response.json();
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
    async test() {
        const start = Date.now();
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            return { ok: true, latency_ms: Date.now() - start };
        }
        catch (err) {
            return { ok: false, latency_ms: Date.now() - start, error: String(err) };
        }
    }
    estimateCost(_inputTokens, _outputTokens, _modelTier) {
        return 0; // Local inference is free
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollama.js.map