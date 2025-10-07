/**
 * Agent Manager for CoreAgent system
 * Manages agent instances using the coreagent architecture
 */

import {System} from '../coreagent/index.js';
import logger from '../coreagent/utils/logger.js';

const log = logger.create('AgentManager');

/**
 * Agent Manager that uses CoreAgent system
 */
export class AgentManager {
    constructor(options = {}) {
        this.options = options;
        this.agents = new Map();
        this.systems = new Map();
    }

    /**
     * Create a new agent instance
     */
    async createAgent(config = {}) {
        const agentId = config.id || `agent_${Date.now()}`;

        log.info(`Creating agent: ${agentId}`);

        // Create CoreAgent system for this agent
        const system = new System(config);
        await system.initialize();

        // Store agent
        this.agents.set(agentId, {
            id: agentId,
            system,
            config,
            created: new Date()
        });

        this.systems.set(agentId, system);

        log.info(`Agent ${agentId} created successfully`);
        return agentId;
    }

    /**
     * Start an agent
     */
    async startAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        log.info(`Starting agent: ${agentId}`);

        if (!agent.system.lifecycle.started) {
            await agent.system.start();
        }

        agent.status = 'running';
        log.info(`Agent ${agentId} started successfully`);
    }

    /**
     * Stop an agent
     */
    async stopAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        log.info(`Stopping agent: ${agentId}`);

        if (agent.system.lifecycle.started) {
            await agent.system.stop();
        }

        agent.status = 'stopped';
        log.info(`Agent ${agentId} stopped successfully`);
    }

    /**
     * Get agent status
     */
    getAgentStatus(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return null;
        }

        return {
            id: agent.id,
            status: agent.status || 'unknown',
            created: agent.created,
            systemStatus: agent.system.getStatus()
        };
    }

    /**
     * Get all agent statuses
     */
    getAllAgentStatuses() {
        const statuses = {};
        for (const [agentId] of this.agents) {
            statuses[agentId] = this.getAgentStatus(agentId);
        }
        return statuses;
    }

    /**
     * Send message to agent
     */
    async sendMessage(agentId, message) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        log.debug(`Sending message to agent ${agentId}:`, message);

        // Use coreagent's message system
        return await agent.system.request('message:handle', message);
    }

    /**
     * Remove an agent
     */
    async removeAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        log.info(`Removing agent: ${agentId}`);

        // Stop agent if running
        if (agent.system.lifecycle.started) {
            await this.stopAgent(agentId);
        }

        // Clean up
        this.agents.delete(agentId);
        this.systems.delete(agentId);

        log.info(`Agent ${agentId} removed successfully`);
    }

    /**
     * Get agent system
     */
    getAgentSystem(agentId) {
        return this.systems.get(agentId);
    }

    /**
     * List all agents
     */
    listAgents() {
        return Array.from(this.agents.keys());
    }
}

// Export default instance
export default AgentManager;