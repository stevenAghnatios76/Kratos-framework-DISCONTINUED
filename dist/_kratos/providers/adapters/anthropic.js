"use strict";
// Kratos Provider Adapter — Anthropic (Claude)
// Lazy-loads @anthropic-ai/sdk. Falls back gracefully if not installed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
class AnthropicProvider {
    name = 'anthropic';
    _available = false;
    client = null;
    config = null;
    get available() { return this._available; }
    async init(config) {
        this.config = config;
        if (!config.enabled)
            return false;
        const apiKey = process.env[config.api_key_env || 'ANTHROPIC_API_KEY'];
        if (!apiKey) {
            this._available = false;
            return false;
        }
        try {
            const sdk = await import('@anthropic-ai/sdk');
            const Anthropic = sdk.default || sdk.Anthropic;
            this.client = new Anthropic({ apiKey });
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
            throw new Error('Anthropic provider not initialized');
        const model = opts?.model || this.config.default_model;
        const maxTokens = opts?.max_tokens || this.config.max_tokens;
        const start = Date.now();
        // Separate system message from conversation
        const systemMsg = messages.find(m => m.role === 'system');
        const conversationMsgs = messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content }));
        const client = this.client;
        const response = await client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature: opts?.temperature,
            ...(systemMsg ? { system: systemMsg.content } : {}),
            messages: conversationMsgs,
        });
        const duration_ms = Date.now() - start;
        const textContent = response.content.find((c) => c.type === 'text');
        return {
            content: textContent?.text || '',
            model: response.model,
            provider: this.name,
            usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
            },
            duration_ms,
            cost_estimate: this.estimateCost(response.usage.input_tokens, response.usage.output_tokens, this.getModelTier(model)),
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
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropic.js.map