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
        this.log({ type: 'start', goal });
    }

    async perceive(observation) {
        this._checkTerminated();
        this.log({ type: 'perception', content: observation });
        await Promise.resolve();
    }

    async getAction() {
        this._checkTerminated();
        const action = await this.agent.decideNextAction(this.goal);
        if (action) {
            this.log({ type: 'action', content: action });
        }
        return action;
    }

    end(reason) {
        if (this.isTerminated) return;
        this.isTerminated = true;
        this.log({ type: 'end', reason });
    }

    log(event) {
        this.history.push({ timestamp: new Date().toISOString(), ...event });
    }

    _checkTerminated() {
        if (this.isTerminated) {
            throw new Error('Interaction has already terminated.');
        }
    }
}

export default MCP;