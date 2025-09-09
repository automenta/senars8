const BasePhase = require('./BasePhase');
const { getActionableGoals, executeGoalPlan } = require('../cycleUtils');

class ActionPhase extends BasePhase {
    constructor() {
        super('Action');
    }

    async execute(cycle) {
        const actionableGoals = getActionableGoals(cycle.memory, cycle.config);
        const executionPromises = actionableGoals.map(goal => this._executeGoalPlan(cycle, goal));
        return await Promise.all(executionPromises);
    }

    async _executeGoalPlan(cycle, goal, maxAttempts = 3) {
        return executeGoalPlan(cycle.planner, goal, maxAttempts);
    }
}

module.exports = ActionPhase;
