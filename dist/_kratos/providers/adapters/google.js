"use strict";
// Kratos Provider Adapter — Google (Gemini)
// Lazy-loads @google/generative-ai SDK. Falls back gracefully if not installed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProvider = void 0;
class GoogleProvider {
    name = 'google';
    _available = false;
    client = null;
    config = null;
    get available() { return this._available; }
    async init(config) {
        this.config = config;
        if (!config.enabled)
            return false;
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
        }
        catch {
            this._available = false;
            return false;
        }
    }
    async complete(messages, opts) {
        if (!this.client || !this.config)
            throw new Error('Google provider not initialized');
        const modelName = opts?.model || this.config.default_model;
        const start = Date.now();
        const genAI = this.client;
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                maxOutputTokens: opts?.max_tokens || this.config.max_tokens,
                temperature: opts?.temperature,
            },
        });
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
            cost_estimate: this.estimateCost(usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0, this.getModelTier(modelName)),
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
exports.GoogleProvider = GoogleProvider;
//# sourceMappingURL=google.js.map