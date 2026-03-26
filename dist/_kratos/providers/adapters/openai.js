"use strict";
// Kratos Provider Adapter — OpenAI
// Lazy-loads openai SDK. Falls back gracefully if not installed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
class OpenAIProvider {
    name = 'openai';
    _available = false;
    client = null;
    config = null;
    get available() { return this._available; }
    async init(config) {
        this.config = config;
        if (!config.enabled)
            return false;
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
        }
        catch {
            this._available = false;
            return false;
        }
    }
    async complete(messages, opts) {
        if (!this.client || !this.config)
            throw new Error('OpenAI provider not initialized');
        const model = opts?.model || this.config.default_model;
        const maxTokens = opts?.max_tokens || this.config.max_tokens;
        const start = Date.now();
        const client = this.client;
        const response = await client.chat.completions.create({
            model,
            max_tokens: maxTokens,
            temperature: opts?.temperature,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
        });
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
            cost_estimate: this.estimateCost(response.usage.prompt_tokens, response.usage.completion_tokens, this.getModelTier(model)),
        };
    }
    async test() {
        const start = Date.now();
        try {
            await this.complete([{ role: 'user', content: 'Reply with OK' }], {
                max_tokens: 10,
                temperature: 0,
            });
            return { ok: true, latency_ms: Date.now() - start };
        }
        catch (err) {
            return { ok: false, latency_ms: Date.now() - start, error: String(err) };
        }
    }
    estimateCost(inputTokens, outputTokens, modelTier) {
        if (!this.config)
            return 0;
        const inputRate = this.config.cost_per_1k_input[modelTier] || 0;
        const outputRate = this.config.cost_per_1k_output[modelTier] || 0;
        return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
    }
    getModelTier(model) {
        if (!this.config)
            return 'standard';
        for (const [tier, name] of Object.entries(this.config.models)) {
            if (name === model)
                return tier;
        }
        return 'standard';
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map