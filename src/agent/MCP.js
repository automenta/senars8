/**
 * Defines the Model Context Protocol (MCP), a lightweight, dependency-free
 * protocol for managing the interaction between an agent and its environment.
 * It provides a standardized way to handle observations, goals, and actions,
 * making it suitable for a wide range of evaluation benchmarks.
 */

class MCP {
    constructor(agent, options = {}) {
        this.agent = agent;
        this.options = options;
        this.history = [];
        this.isTerminated = false;
    }

    async start(goal) {
        if (!this.agent.isInitialized) {
            await this.agent.initialize();
        }
        this.goal = goal;
        this.log({type: 'start', goal});
    }

    async perceive(observation) {
        if (this.isTerminated) {
            throw new Error('Interaction has already terminated.');
        }
        this.log({type: 'perception', content: observation});
        await Promise.resolve();
    }

    async getAction() {
        if (this.isTerminated) {
            throw new Error('Interaction has already terminated.');
        }
        const action = await this.agent.decideNextAction(this.goal, this.history);
        if (action) {
            this.log({type: 'action', content: action});
        }
        return action;
    }

    end(reason) {
        if (this.isTerminated) {
            return;
        }
        this.isTerminated = true;
        this.log({type: 'end', reason});
    }

    log(event) {
        this.history.push({
            timestamp: new Date().toISOString(),
            ...event
        });
    }
}

export default MCP;
