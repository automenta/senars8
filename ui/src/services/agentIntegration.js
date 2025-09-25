/**
 * Agent Integration Service
 * Provides a high-level interface between the UI and the backend agent service
 */

import agentService from './agentService.js';
import log from '@/utils/logger';

class AgentIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the agent integration 
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      // Agent service should already be handling the backend connection
      // We just need to ensure the service is ready
      this.isInitialized = true;
      
      log.info('Agent integration initialized successfully');
    })();

    return this.initializationPromise;
  }

  /**
   * Process a NARS statement through the agent
   */
  async processNarsese(narsese) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Validate input
      if (!narsese || typeof narsese !== 'string' || narsese.trim().length === 0) {
        throw new Error('Narsese input is required and must be a non-empty string');
      }
      
      // Send the narsese to the backend agent
      const result = agentService.sendNarsese(narsese);
      
      // Log successful processing
      log.debug(`Narsese sent to agent: ${narsese}`);
      
      return result;
    } catch (error) {
      log.error('Error processing narsese:', error);
      throw error;
    }
  }

  /**
   * Get the current state from the agent
   */
  getAgentState() {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }

    return agentService.getAgentState();
  }

  /**
   * Send a control command to the agent
   */
  sendAgentCommand(command, parameters = {}) {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }

    try {
      // Validate command
      if (!command || typeof command !== 'string') {
        throw new Error('Command is required and must be a string');
      }
      
      const validCommands = ['start', 'stop', 'reset'];
      if (!validCommands.includes(command.toLowerCase())) {
        throw new Error(`Invalid command: ${command}. Valid commands are: ${validCommands.join(', ')}`);
      }
      
      return agentService.sendAgentControl(command);
    } catch (error) {
      log.error('Error executing agent command:', error);
      throw error;
    }
  }

  /**
   * Get agent statistics and information
   */
  getAgentInfo() {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }

    return {
      isInitialized: true, // Agent service exists
      isActive: agentService.isAgentRunning(),
      beliefsCount: agentService.getBeliefsCount(),
      goalsCount: agentService.getGoalsCount(),
      questionsCount: agentService.getQuestionsCount(),
      cycleCount: agentService.getCycleCount(),
      timestamp: Date.now()
    };
  }

  // Proxy methods to agent service's data access methods
  getBeliefs() {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }
    // For now, we'll get this from the agent service or return empty
    // In a real implementation, we might listen to events and maintain state
    return []; 
  }

  getGoals() {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }
    return [];
  }

  getQuestions() {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }
    return [];
  }

  getAllTasks() {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }
    return agentService.getTasks();
  }

  getRecentTasks(count = 10) {
    if (!this.isInitialized) {
      throw new Error('Agent integration not initialized');
    }
    // Placeholder - in real implementation, would track recent tasks
    return [];
  }
}

// Export singleton instance
const agentIntegrationService = new AgentIntegrationService();
export default agentIntegrationService;