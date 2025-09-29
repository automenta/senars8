import LLMProvider from './LLMProvider.js';

/**
 * Anthropic Provider for LangChain integration
 */
class AnthropicProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.modelName = config.modelName || "claude-3-sonnet-20240229";
    this.temperature = config.temperature || 0.7;
    this.llm = null;
    this.tokenUsage = { input: 0, output: 0, total: 0 };
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error("Anthropic API key is required");
    }

    const { ChatAnthropic } = await import("@langchain/anthropic");
    
    this.llm = new ChatAnthropic({
      modelName: this.modelName,
      temperature: this.temperature,
      apiKey: this.apiKey,
      streaming: true
    });

    this.initialized = true;
  }

  async processQuery(query, options = {}) {
    if (!this.initialized || !this.llm) {
      throw new Error("AnthropicProvider not initialized");
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
      this.tokenUsage.input += result.response_metadata.token_usage?.input_tokens || 0;
      this.tokenUsage.output += result.response_metadata.token_usage?.output_tokens || 0;
      this.tokenUsage.total = this.tokenUsage.input + this.tokenUsage.output;
    }

    return {
      content: result.content,
      tokens: {
        input: result.response_metadata?.token_usage?.input_tokens || 0,
        output: result.response_metadata?.token_usage?.output_tokens || 0
      },
      sources: [],
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

export default AnthropicProvider;