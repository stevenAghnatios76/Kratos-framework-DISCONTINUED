import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse, ModelTier } from './provider-interface';
interface ProvidersConfig {
    providers: Record<string, LLMProviderConfig>;
    failover: {
        enabled: boolean;
        max_retries: number;
        retry_delay_ms: number;
        fallback_chain: string[];
    };
    tiers: Record<string, {
        range: [number, number];
        description: string;
        preferred_model?: string;
    }>;
}
export declare class ProviderRegistry {
    private providers;
    private configs;
    private failoverConfig;
    private tiersConfig;
    private initialized;
    /**
     * Initialize all providers from providers.yaml config.
     */
    init(configPath: string): Promise<void>;
    /**
     * Send a completion request with automatic failover.
     */
    complete(messages: LLMMessage[], opts?: {
        provider?: string;
        model?: string;
        max_tokens?: number;
        temperature?: number;
        modelTier?: ModelTier;
    }): Promise<LLMResponse>;
    /**
     * Get the best provider for a given tier.
     */
    getProviderForTier(tier: ModelTier): {
        provider: string;
        model: string;
    } | null;
    /**
     * List all registered providers with availability status.
     */
    listProviders(): Array<{
        name: string;
        available: boolean;
        tier: string;
        models: Record<string, string>;
    }>;
    /**
     * Estimate cost for a request across all available providers.
     */
    estimateCost(inputTokens: number, outputTokens: number, modelTier: ModelTier): Record<string, number>;
    /**
     * Get tier configuration.
     */
    getTiers(): ProvidersConfig['tiers'] | null;
    /**
     * Get a specific provider by name.
     */
    getProvider(name: string): LLMProvider | undefined;
    private ensureInitialized;
}
export {};
