import {createSystem} from '../system/SystemFactory.js';
import {debug, info, warn} from '../utils/logger.js';
import EventBus from '../system/EventBus.js';
import AgentMessageBus from './AgentMessageBus.js';
import AgentCoordinator from './AgentCoordinator.js';
import RoleConfigManager from './RoleConfigManager.js';

/**
 * MultiAgentSystem coordinates multiple SeNARS agents with specialized roles
 * and enables collaborative problem solving.
 */
class MultiAgentSystem {
  constructor(config = {}) {
    this.config = config;
    this.agents = new Map();
    this.agentRoles = new Map();
    this.eventBus = new EventBus();
    this.roleConfigManager = new RoleConfigManager(config);
    this.messageBus = new AgentMessageBus(this, this.eventBus);
    this.coordinator = new AgentCoordinator(this);
    this.isRunning = false;
    this.cycleCount = 0;
    
    info('MultiAgentSystem initialized');
  }

  /**
   * Create a specialized agent with a specific role
   * @param {string} role - The role of the agent (e.g., 'planner', 'executor', 'critic')
   * @param {Object} config - Configuration for the agent
   * @returns {Object} - The created agent
   */
  async createSpecializedAgent(role, config = {}) {
    // Get role-specific configuration
    const roleConfig = this.roleConfigManager.getRoleConfig(role);
    const agentConfig = { ...roleConfig, ...config };
    
    // Create a new SeNARS system for the agent
    const agentSystem = await createSystem(agentConfig);
    
    // Store role information
    const agentId = agentSystem.id || `agent_${Date.now()}`;
    this.agentRoles.set(agentId, role);
    
    // Add to agents collection
    this.agents.set(agentId, agentSystem);
    
    info(`Created specialized agent with role: ${role} (ID: ${agentId})`);
    
    return agentSystem;
  }

  /**
   * Register an agent with the system (for externally created agents)
   * @param {string} id - Agent identifier
   * @param {Object} agentSystem - The SeNARS system instance
   * @param {string} role - The role of the agent
   */
  registerAgent(id, agentSystem, role = 'default') {
    this.agents.set(id, agentSystem);
    this.agentRoles.set(id, role);
    info(`Registered agent ${id} with role: ${role}`);
  }

  /**
   * Get an agent by ID
   * @param {string} id - Agent identifier
   * @returns {Object} - The agent system or null
   */
  getAgentById(id) {
    return this.agents.get(id) || null;
  }

  /**
   * Start the multi-agent system
   */
  async start() {
    if (this.isRunning) {
      warn('MultiAgentSystem is already running');
      return;
    }

    info('Starting MultiAgentSystem...');
    this.isRunning = true;
    
    // Start all registered agents
    for (const [id, agent] of this.agents) {
      if (agent.start) {
        agent.start();
        info(`Started agent: ${id}`);
      }
    }
    
    // Start the message bus
    this.messageBus.start();
    
    info('MultiAgentSystem started successfully');
  }

  /**
   * Stop the multi-agent system
   */
  async stop() {
    if (!this.isRunning) {
      warn('MultiAgentSystem is not running');
      return;
    }

    info('Stopping MultiAgentSystem...');
    this.isRunning = false;
    
    // Stop the message bus
    this.messageBus.stop();
    
    // Stop all registered agents
    for (const [id, agent] of this.agents) {
      if (agent.stop) {
        agent.stop();
        info(`Stopped agent: ${id}`);
      }
    }
    
    info('MultiAgentSystem stopped');
  }

  /**
   * Coordinate agents to solve a goal
   * @param {Object} goal - The goal task to solve
   * @returns {Object} - Result of the coordination
   */
  async coordinateForGoal(goal) {
    if (!this.coordinator) {
      throw new Error('Agent coordinator not initialized');
    }
    
    return await this.coordinator.coordinateForGoal(goal);
  }

  /**
   * Send a message to one or more agents
   * @param {Object} message - The message to send
   * @param {Array|string} toAgents - Agent ID(s) to send to
   */
  sendMessage(message, toAgents) {
    return this.messageBus.send(message, toAgents);
  }

  /**
   * Delegate a task to a specific agent
   * @param {Object} task - The task to delegate
   * @param {string} agentId - The agent ID to delegate to
   * @returns {Object} - Result of the delegation
   */
  async delegateTask(task, agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    const agent = this.agents.get(agentId);
    const role = this.agentRoles.get(agentId);

    // Add the task to the agent's memory
    if (agent.memory) {
      agent.memory.addTasks([task]);
      info(`Delegated task to agent ${agentId} (role: ${role})`);
      
      return {
        success: true,
        agentId,
        task: task.termKey,
        role
      };
    } else {
      throw new Error(`Agent ${agentId} has no memory system`);
    }
  }

  /**
   * Get all agents with a specific role
   * @param {string} role - The role to filter by
   * @returns {Array} - Array of agents with the specified role
   */
  getAgentsByRole(role) {
    return Array.from(this.agents.entries())
      .filter(([id, agent]) => this.agentRoles.get(id) === role)
      .map(([id, agent]) => ({ id, agent, role: this.agentRoles.get(id) }));
  }

  /**
   * Get system statistics
   * @returns {Object} - Statistics about the multi-agent system
   */
  getStatistics() {
    const stats = {
      totalAgents: this.agents.size,
      agentsByRole: {},
      running: this.isRunning,
      cycleCount: this.cycleCount
    };

    // Count agents by role
    for (const [id, role] of this.agentRoles) {
      if (!stats.agentsByRole[role]) {
        stats.agentsByRole[role] = 0;
      }
      stats.agentsByRole[role]++;
    }

    return stats;
  }

  /**
   * Perform a system-level cognitive cycle
   */
  async systemCycle() {
    this.cycleCount++;
    
    // This would handle cross-agent coordination and synchronization
    // For now, just log the cycle
    debug(`MultiAgentSystem cycle ${this.cycleCount} completed`);
  }

  /**
   * Register a custom role configuration
   * @param {string} role - The role name
   * @param {Object} config - The role configuration
   */
  registerRole(role, config) {
    this.roleConfigManager.registerRoleConfig(role, config);
  }

  /**
   * Get available agent roles
   * @returns {Array} - Array of available role names
   */
  getAvailableRoles() {
    return this.roleConfigManager.getAvailableRoles();
  }
}

export default MultiAgentSystem;