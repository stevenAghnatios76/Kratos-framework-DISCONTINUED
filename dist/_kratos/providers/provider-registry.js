"use strict";
// Kratos Provider Registry
// Central registry for all LLM providers with failover support.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
const anthropic_1 = require("./adapters/anthropic");
const openai_1 = require("./adapters/openai");
const google_1 = require("./adapters/google");
const ollama_1 = require("./adapters/ollama");
class ProviderRegistry {
    providers = new Map();
    configs = new Map();
    failoverConfig = null;
    tiersConfig = null;
    initialized = false;
    /**
     * Initialize all providers from providers.yaml config.
     */
    async init(configPath) {
        if (!fs.existsSync(configPath)) {
            throw new Error(`Provider config not found: ${configPath}`);
        }
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = yaml.parse(raw);
        this.failoverConfig = config.failover;
        this.tiersConfig = config.tiers;
        // Register built-in providers
        const adapterMap = {
            anthropic: new anthropic_1.AnthropicProvider(),
            openai: new openai_1.OpenAIProvider(),
            google: new google_1.GoogleProvider(),
            ollama: new ollama_1.OllamaProvider(),
        };
        for (const [name, providerConfig] of Object.entries(config.providers)) {
            this.configs.set(name, providerConfig);
            const adapter = adapterMap[name];
            if (adapter) {
                await adapter.init(providerConfig);
                this.providers.set(name, adapter);
            }
        }
        this.initialized = true;
    }
    /**
     * Send a completion request with automatic failover.
     */
    async complete(messages, opts) {
        this.ensureInitialized();
        // If specific provider requested, try it directly
        if (opts?.provider) {
            const provider = this.providers.get(opts.provider);
            if (!provider?.available)
                throw new Error(`Provider ${opts.provider} not available`);
            const model = opts.model || (opts.modelTier
                ? this.configs.get(opts.provider)?.models[opts.modelTier]
                : undefined);
            return provider.complete(messages, { ...opts, model });
        }
        // Otherwise, walk the failover chain
        const chain = this.failoverConfig?.fallback_chain || [...this.providers.keys()];
        const maxRetries = this.failoverConfig?.max_retries || 2;
        const retryDelay = this.failoverConfig?.retry_delay_ms || 1000;
        const errors = [];
        for (const providerName of chain) {
            const provider = this.providers.get(providerName);
            if (!provider?.available)
                continue;
            const model = opts?.model || (opts?.modelTier
                ? this.configs.get(providerName)?.models[opts.modelTier]
                : undefined);
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    return await provider.complete(messages, { ...opts, model });
                }
                catch (err) {
                    errors.push(`${providerName} attempt ${attempt + 1}: ${err}`);
                    if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, retryDelay));
                    }
                }
            }
        }
        throw new Error(`All providers failed:\n${errors.join('\n')}`);
    }
    /**
     * Get the best provider for a given tier.
     */
    getProviderForTier(tier) {
        this.ensureInitialized();
        const chain = this.failoverConfig?.fallback_chain || [...this.providers.keys()];
        for (const name of chain) {
            const provider = this.providers.get(name);
            const config = this.configs.get(name);
            if (provider?.available && config) {
                return { provider: name, model: config.models[tier] };
            }
        }
        return null;
    }
    /**
     * List all registered providers with availability status.
     */
    listProviders() {
        this.ensureInitialized();
        const result = [];
        for (const [name, provider] of this.providers) {
            const config = this.configs.get(name);
            result.push({
                name,
                available: provider.available,
                tier: config?.tier || 'unknown',
                models: config?.models || { fast: '', standard: '', deep_reasoning: '' },
            });
        }
        return result;
    }
    /**
     * Estimate cost for a request across all available providers.
     */
    estimateCost(inputTokens, outputTokens, modelTier) {
        this.ensureInitialized();
        const estimates = {};
        for (const [name, provider] of this.providers) {
            if (provider.available) {
                estimates[name] = provider.estimateCost(inputTokens, outputTokens, modelTier);
            }
        }
        return estimates;
    }
    /**
     * Get tier configuration.
     */
    getTiers() {
        return this.tiersConfig;
    }
    /**
     * Get a specific provider by name.
     */
    getProvider(name) {
        return this.providers.get(name);
    }
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('ProviderRegistry not initialized. Call init() first.');
    }
}
exports.ProviderRegistry = ProviderRegistry;
//# sourceMappingURL=provider-registry.js.map