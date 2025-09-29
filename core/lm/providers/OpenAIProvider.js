import LLMProvider from './LLMProvider.js';

/**
 * OpenAI Provider for LangChain integration
 */
class OpenAIProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.modelName = config.modelName || "gpt-4";
    this.temperature = config.temperature || 0.7;
    this.llm = null;
    this.tokenUsage = { input: 0, output: 0, total: 0 };
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    const { ChatOpenAI } = await import("@langchain/openai");
    
    this.llm = new ChatOpenAI({
      modelName: this.modelName,
      temperature: this.temperature,
      apiKey: this.apiKey,
      streaming: true
    });

    this.initialized = true;
  }

  async processQuery(query, options = {}) {
    if (!this.initialized || !this.llm) {
      throw new Error("OpenAIProvider not initialized");
    }

    const messages = [{
      role: "user",
      content: query
    }];

    const result = await this.llm.invoke(messages, {
      tools: options.tools || [],
      tool_choice: options.toolChoice || "auto"
    });

    // Update token usage
    if (result.response_metadata) {
      this.tokenUsage.input += result.response_metadata.token_usage?.prompt_tokens || 0;
      this.tokenUsage.output += result.response_metadata.token_usage?.completion_tokens || 0;
      this.tokenUsage.total = this.tokenUsage.input + this.tokenUsage.output;
    }

    return {
      content: result.content,
      tokens: {
        input: result.response_metadata?.token_usage?.prompt_tokens || 0,
        output: result.response_metadata?.token_usage?.completion_tokens || 0
      },
      sources: result.additional_kwargs?.function_call ? [result.additional_kwargs.function_call] : [],
      rawResponse: result
    };
  }

  getTokenUsage() {
    return { ...this.tokenUsage };
  }

  resetTokenUsage() {
    this.tokenUsage = { input: 0, output: 0, total: 0 };
  }
}

export default OpenAIProvider;