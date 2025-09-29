import LLMProvider from './LLMProvider.js';

/**
 * Ollama Provider for LangChain integration
 */
class OllamaProvider extends LLMProvider {
  constructor(config = {}) {
    super(config);
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama2";
    this.temperature = config.temperature || 0.7;
    this.llm = null;
    this.tokenUsage = { input: 0, output: 0, total: 0 };
  }

  async initialize() {
    const { ChatOllama } = await import("@langchain/ollama");
    
    this.llm = new ChatOllama({
      baseUrl: this.baseUrl,
      model: this.model,
      temperature: this.temperature
    });

    this.initialized = true;
  }

  async processQuery(query, options = {}) {
    if (!this.initialized || !this.llm) {
      throw new Error("OllamaProvider not initialized");
    }

    const messages = [{
      role: "user",
      content: query
    }];

    const result = await this.llm.invoke(messages, {
      tools: options.tools || [],
      tool_choice: options.toolChoice || "auto"
    });

    return {
      content: result.content,
      tokens: { input: 0, output: 0 }, // Ollama may not provide detailed token usage
      sources: [],
      rawResponse: result
    };
  }
}

export default OllamaProvider;