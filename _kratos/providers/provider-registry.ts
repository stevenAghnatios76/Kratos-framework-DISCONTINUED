// Kratos Provider Registry
// Central registry for all LLM providers with failover support.

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse, ModelTier } from './provider-interface';
import { AnthropicProvider } from './adapters/anthropic';
import { OpenAIProvider } from './adapters/openai';
import { GoogleProvider } from './adapters/google';
import { OllamaProvider } from './adapters/ollama';

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

export class ProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private configs = new Map<string, LLMProviderConfig>();
  private failoverConfig: ProvidersConfig['failover'] | null = null;
  private tiersConfig: ProvidersConfig['tiers'] | null = null;
  private initialized = false;

  /**
   * Initialize all providers from providers.yaml config.
   */
  async init(configPath: string): Promise<void> {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Provider config not found: ${configPath}`);
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.parse(raw) as ProvidersConfig;

    this.failoverConfig = config.failover;
    this.tiersConfig = config.tiers;

    // Register built-in providers
    const adapterMap: Record<string, LLMProvider> = {
      anthropic: new AnthropicProvider(),
      openai: new OpenAIProvider(),
      google: new GoogleProvider(),
      ollama: new OllamaProvider(),
    };

    for (const [name, providerConfig] of Object.entries(config.providers)) {
      this.configs.set(name, providerConfig as LLMProviderConfig);
      const adapter = adapterMap[name];
      if (adapter) {
        await adapter.init(providerConfig as LLMProviderConfig);
        this.providers.set(name, adapter);
      }
    }

    this.initialized = true;
  }

  /**
   * Send a completion request with automatic failover.
   */
  async complete(messages: LLMMessage[], opts?: {
    provider?: string;
    model?: string;
    max_tokens?: number;
    temperature?: number;
    modelTier?: ModelTier;
  }): Promise<LLMResponse> {
    this.ensureInitialized();

    // If specific provider requested, try it directly
    if (opts?.provider) {
      const provider = this.providers.get(opts.provider);
      if (!provider?.available) throw new Error(`Provider ${opts.provider} not available`);

      const model = opts.model || (opts.modelTier
        ? this.configs.get(opts.provider)?.models[opts.modelTier]
        : undefined);

      return provider.complete(messages, { ...opts, model });
    }

    // Otherwise, walk the failover chain
    const chain = this.failoverConfig?.fallback_chain || [...this.providers.keys()];
    const maxRetries = this.failoverConfig?.max_retries || 2;
    const retryDelay = this.failoverConfig?.retry_delay_ms || 1000;
    const errors: string[] = [];

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider?.available) continue;

      const model = opts?.model || (opts?.modelTier
        ? this.configs.get(providerName)?.models[opts.modelTier]
        : undefined);

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await provider.complete(messages, { ...opts, model });
        } catch (err) {
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
  getProviderForTier(tier: ModelTier): { provider: string; model: string } | null {
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
  listProviders(): Array<{
    name: string;
    available: boolean;
    tier: string;
    models: Record<string, string>;
  }> {
    this.ensureInitialized();

    const result: Array<{
      name: string;
      available: boolean;
      tier: string;
      models: Record<string, string>;
    }> = [];

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
  estimateCost(inputTokens: number, outputTokens: number, modelTier: ModelTier): Record<string, number> {
    this.ensureInitialized();

    const estimates: Record<string, number> = {};
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
  getTiers(): ProvidersConfig['tiers'] | null {
    return this.tiersConfig;
  }

  /**
   * Get a specific provider by name.
   */
  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  private ensureInitialized(): void {
    if (!this.initialized) throw new Error('ProviderRegistry not initialized. Call init() first.');
  }
}
