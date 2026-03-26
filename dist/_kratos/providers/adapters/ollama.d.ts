import type { LLMProvider, LLMProviderConfig, LLMMessage, LLMResponse } from '../provider-interface';
export declare class OllamaProvider implements LLMProvider {
    readonly name = "ollama";
    private _available;
    private baseUrl;
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
    estimateCost(_inputTokens: number, _outputTokens: number, _modelTier: string): number;
}
