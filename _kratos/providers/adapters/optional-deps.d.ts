// Type declarations for optional LLM SDK dependencies.
// These SDKs are lazy-loaded and may not be installed.

declare module '@anthropic-ai/sdk' {
  class Anthropic {
    constructor(opts: { apiKey: string });
    messages: {
      create(opts: unknown): Promise<unknown>;
    };
  }
  export default Anthropic;
  export { Anthropic };
}

declare module 'openai' {
  class OpenAI {
    constructor(opts: { apiKey: string });
    chat: {
      completions: {
        create(opts: unknown): Promise<unknown>;
      };
    };
  }
  export default OpenAI;
  export { OpenAI };
}

declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(opts: unknown): unknown;
  }
}
