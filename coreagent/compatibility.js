// coreagent/compatibility.js
// Compatibility layer to integrate new coreagent with existing core and agent systems

import { System as NewSystem } from './System.js';
import { createCore } from './createCore.js';

/**
 * Creates a compatibility adapter that allows the new coreagent system
 * to work alongside the existing core system
 */
export class CoreAgentAdapter {
  constructor(existingCore) {
    this.existingCore = existingCore;
    this.newCoreAgent = null;
  }

  /**
   * Initialize the new coreagent system with compatibility features
   */
  async initializeNewSystem(config = {}) {
    // Create new system
    this.newCoreAgent = new NewSystem(config);
    
    // Set up compatibility mappings
    await this.setupCompatibility();
    
    await this.newCoreAgent.initialize();
    return this.newCoreAgent;
  }

  /**
   * Sets up event forwarding between old and new systems
   */
  setupCompatibility() {
    // Forward events from new system to old system if available
    if (this.existingCore?.eventBus) {
      this.newCoreAgent.on('task:add', (task) => {
        this.existingCore.eventBus.emit('add_task', task);
      });
      
      this.newCoreAgent.on('belief:add', (belief) => {
        this.existingCore.eventBus.emit('add_belief', belief);
      });
      
      this.newCoreAgent.on('goal:add', (goal) => {
        this.existingCore.eventBus.emit('add_goal', goal);
      });
      
      this.newCoreAgent.on('question:add', (question) => {
        this.existingCore.eventBus.emit('add_question', question);
      });
    }
    
    // Set up command forwarding from old to new system
    if (this.existingCore) {
      // Register handlers for commands that the new system can handle
      this.existingCore.handle?.('new-system:process', async (data) => {
        return await this.newCoreAgent.request('reasoner:processTask', data);
      });
    }
  }

  /**
   * Gets the new coreagent system
   */
  getNewSystem() {
    return this.newCoreAgent;
  }

  /**
   * Starts both systems
   */
  async start() {
    await this.newCoreAgent?.start();
  }

  /**
   * Stops both systems
   */
  async stop() {
    await this.newCoreAgent?.stop();
  }
}

/**
 * Factory function to create a new system with optional integration
 * with existing components
 */
export async function createIntegratedSystem(userConfig = {}, integrationOptions = {}) {
  const { integrateWithExisting = false, existingCore = null } = integrationOptions;
  
  if (integrateWithExisting && existingCore) {
    const adapter = new CoreAgentAdapter(existingCore);
    return await adapter.initializeNewSystem(userConfig);
  } else {
    const system = new NewSystem(userConfig);
    await system.initialize();
    return system;
  }
}