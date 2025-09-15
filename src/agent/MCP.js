/**
 * @fileoverview Defines the Model Context Protocol (MCP), a lightweight, dependency-free
 * protocol for managing the interaction between an agent and its environment.
 * It provides a standardized way to handle observations, goals, and actions,
 * making it suitable for a wide range of evaluation benchmarks.
 */

/**
 * Manages the interaction lifecycle between an agent and an environment.
 */
class MCP {
    /**
     * @param {Agent} agent - The agent instance to interact with.
     * @param {object} [options={}] - Configuration options for the interaction.
     */
    constructor(agent, options = {}) {
        this.agent = agent;
        this.options = options;
        this.history = [];
        this.isTerminated = false;
    }

    /**
     * Starts a new interaction session.
     * @param {string} goal - The high-level goal for the agent.
     * @returns {Promise<void>}
     */
    async start(goal) {
        if (!this.agent.isInitialized) {
            await this.agent.initialize();
        }
        this.goal = goal;
        this.log({type: 'start', goal});
    }

    /**
     * Sends an observation to the agent.
     * @param {string} observation - The observation to send to the agent.
     * @returns {Promise<void>}
     */
    async perceive(observation) {
        if (this.isTerminated) {
            throw new Error('Interaction has already terminated.');
        }
        // In a real implementation, this would involve adding the observation
        // to the agent's memory or triggering a perception event.
        // For now, we'll just log it.
        this.log({type: 'perception', content: observation});
        // This is a placeholder for the agent processing the observation.
        await Promise.resolve();
    }

    /**
     * Gets the next action(s) from the agent.
     * @returns {Promise<object|null>} The agent's next action, or null if no action is decided.
     */
    async getAction() {
        if (this.isTerminated) {
            throw new Error('Interaction has already terminated.');
        }
        // This is where the agent's reasoning cycle would be triggered to decide on an action.
        // The `achieve` method in the agent will be refactored to support this.
        const action = await this.agent.decideNextAction(this.goal, this.history);
        if (action) {
            this.log({type: 'action', content: action});
        }
        return action;
    }

    /**
     * Ends the interaction session.
     * @param {string} reason - The reason for ending the interaction.
     */
    end(reason) {
        if (this.isTerminated) {
            return;
        }
        this.isTerminated = true;
        this.log({type: 'end', reason});
    }

    /**
     * Logs an event in the interaction history.
     * @param {object} event - The event to log.
     */
    log(event) {
        this.history.push({
            timestamp: new Date().toISOString(),
            ...event
        });
    }
}

export default MCP;
