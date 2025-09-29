/**
 * Interface for LLM providers in the LangChain ecosystem
 */
class LLMProvider {
  constructor(config = {}) {
    if (this.constructor === LLMProvider) {
      throw new Error("LLMProvider is an abstract class and cannot be instantiated directly");
    }
    this.config = config;
    this.initialized = false;
  }

  /**
   * Initialize the provider
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error("initialize() method must be implemented by subclasses");
  }

  /**
   * Check if the provider is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Process a query using this provider
   * @param {string} query - The query to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - The result of processing
   */
  async processQuery(query, options = {}) {
    throw new Error("processQuery() method must be implemented by subclasses");
  }

  /**
   * Get token usage statistics
   * @returns {Object} - Token usage statistics
   */
  getTokenUsage() {
    return { input: 0, output: 0, total: 0 };
  }

  /**
   * Reset token usage statistics
   */
  resetTokenUsage() {
    // Default implementation - override in subclasses if needed
  }
}

export default LLMProvider;