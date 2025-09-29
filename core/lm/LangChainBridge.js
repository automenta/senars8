import ToolRegistry from './ToolRegistry.js';
import OpenAIProvider from './providers/OpenAIProvider.js';
import AnthropicProvider from './providers/AnthropicProvider.js';
import OllamaProvider from './providers/OllamaProvider.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('LangChainBridge');

/**
 * LangChainBridge connects SeNARS cognitive system with LangChain ecosystem
 * for enhanced LLM capabilities, tool management, and context handling.
 */
class LangChainBridge {
  constructor(options = {}) {
    this.options = options;
    this.providers = new Map();
    this.activeProvider = null;
    this.providerRegistry = {
      'openai': OpenAIProvider,
      'anthropic': AnthropicProvider,
      'ollama': OllamaProvider
    };
    this.toolRegistry = new ToolRegistry();
    this.memory = null;
  }

  /**
   * Initialize the LangChain bridge with configuration
   * @param {Object} config - Configuration for LLM providers and tools
   */
  async initialize(config = {}) {
    // Initialize supported providers
    await this._initProvider('openai', config.openai);
    await this._initProvider('anthropic', config.anthropic);
    await this._initProvider('ollama', config.ollama);
    
    // Set active provider based on configuration
    const providerName = config.provider || 'xenova';
    await this.setActiveProvider(providerName);
    
    // Initialize external memory if configured
    if (config.memory) {
      this.memory = this._initMemory(config.memory);
    }
  }

  /**
   * Initialize a specific provider
   * @param {string} providerName - Name of the provider
   * @param {Object} config - Provider configuration
   */
  async _initProvider(providerName, config) {
    if (!config) return;

    const ProviderClass = this.providerRegistry[providerName];
    if (!ProviderClass) {
      throw new Error(`Provider ${providerName} not supported`);
    }

    try {
      const provider = new ProviderClass(config);
      await provider.initialize();
      this.providers.set(providerName, provider);
    } catch (error) {
      console.warn(`Failed to initialize ${providerName} provider:`, error.message);
    }
  }

  /**
   * Set the active LLM provider
   * @param {string} providerName - Name of the provider to activate
   */
  async setActiveProvider(providerName) {
    if (providerName === 'xenova') {
      // For local models, we'll continue using the existing approach
      // but with LangChain compatibility
      this.activeProvider = null;
      return;
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not initialized`);
    }

    this.activeProvider = provider;
  }

  /**
   * Get the active provider
   * @returns {LLMProvider|null} - The active provider or null
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  _initMemory(config) {
    // Placeholder for memory initialization
    // In a real implementation, this would connect to vector databases
    return {
      type: config.type,
      config: config
    };
  }

  /**
   * Register a SeNARS task as a LangChain tool
   * @param {Object} task - The SeNARS task to be registered as a tool
   * @param {Function} handler - The function to execute when the tool is called
   */
  registerTaskAsTool(task, handler) {
    return this.toolRegistry.registerTaskAsTool(task, handler);
  }

  /**
   * Register a standard LangChain tool
   * @param {Object} toolSpec - Tool specification in LangChain format
   */
  registerLangChainTool(toolSpec) {
    return this.toolRegistry.registerLangChainTool(toolSpec);
  }

  /**
   * Get registered tools in OpenAI function format for tool calling
   * @returns {Array} - Array of function definitions for LLM tool calling
   */
  getToolFunctions() {
    return this.toolRegistry.getToolFunctions();
  }

  /**
   * Execute a chain of tools with inputs
   * @param {Array} toolNames - Array of tool names to execute in sequence
   * @param {Object} inputs - Initial inputs to the tool chain
   * @returns {Object} - Final result of the tool chain
   */
  async executeToolChain(toolNames, inputs) {
    return this.toolRegistry.executeToolChain(toolNames, inputs);
  }

  /**
   * Use MCP for context management during reasoning
   * @param {Object} task - The current task being processed
   * @returns {Object} - Enhanced context for the reasoning process
   */
  async updateContextForTask(task) {
    // This method would be called during the reasoning cycle
    // to enrich context using LangChain capabilities
    const context = {
      task: task,
      relatedMemories: [],
      relevantTools: []
    };

    // If memory is configured, retrieve relevant information
    if (this.memory) {
      // This would be implemented with actual memory retrieval logic
      // depending on the memory type (vector store, etc.)
    }

    // Add available tools to context
    context.relevantTools = this.toolRegistry.getTools().map(tool => ({
      name: tool.name,
      description: tool.description
    }));

    return context;
  }

  /**
   * Process a natural language query using LangChain LLMs
   * @param {string} query - The natural language query
   * @param {Object} options - Processing options
   * @returns {Object} - Processed response with metadata
   */
  async processQuery(query, options = {}) {
    if (!this.activeProvider) {
      // Fallback to local processing if no provider is active
      return {
        content: "Local processing not yet implemented",
        tokens: { input: 0, output: 0 },
        sources: []
      };
    }

    try {
      const result = await this.activeProvider.processQuery(query, {
        ...options,
        tools: this.toolRegistry.getTools()
      });
      return result;
    } catch (error) {
      return errorHandler.handle(error, 'processQuery', {
        content: "Error processing query with LLM provider",
        tokens: { input: 0, output: 0 },
        sources: [],
        error: error.message
      });
    }
  }

  /**
   * Get token usage statistics from the active provider
   * @returns {Object} - Token usage statistics
   */
  getTokenUsage() {
    if (this.activeProvider) {
      return this.activeProvider.getTokenUsage();
    }
    return { input: 0, output: 0, total: 0 };
  }

  /**
   * Reset token usage statistics on the active provider
   */
  resetTokenUsage() {
    if (this.activeProvider) {
      this.activeProvider.resetTokenUsage();
    }
  }
}

export default LangChainBridge;