import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse } from '../provider-interface';
export declare class OpenAIProvider implements LLMProvider {
    readonly name = "openai";
    private _available;
    private client;
    private config;
    get available(): boolean;
    init(config: LLMProviderConfig): Promise<boolean>;
    complete(messages: LLMMessage[], opts?: {
        model?: string;
        max_tokens?: number;
        temperature?: number;
    }): Promise<LLMResponse>;
    test(): Promise<{
        ok: boolean;
        latency_ms: number;
        error?: string;
    }>;
    estimateCost(inputTokens: number, outputTokens: number, modelTier: string): number;
    private getModelTier;
}
