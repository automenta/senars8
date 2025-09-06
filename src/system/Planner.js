const HTNPlanner = require('../reasoner/HTNPlanner');
const actionExecutor = require('./ActionExecutor');

class Planner {
    constructor(memory) {
        if (!memory) {
            throw new Error('Planner requires a memory instance.');
        }
        this.memory = memory;
        this.htnPlanner = new HTNPlanner(this.memory);
        this.actionPlans = new Map();
    }

    async planAndExecute(goalTask) {
        const plan = await this.htnPlanner.findPlan(goalTask);

        if (!plan || plan.length === 0) {
            return { success: false, error: 'No plan found' };
        }

        const planId = `plan_${Date.now()}`;
        this.actionPlans.set(planId, plan);

        const executionResults = [];
        for (const term of plan) {
            // The plan consists of terms representing primitive actions
            const action = {
                name: term.key, // Assuming the term key is the action name
                parameters: [] // Assuming no parameters for now
            };

            const result = await actionExecutor.executeAction(action);
            executionResults.push({
                action: action.name,
                result: result
            });

            if (!result.success) {
                return {
                    success: false,
                    planId: planId,
                    error: `Plan failed at action ${action.name}`,
                    results: executionResults
                };
            }
        }

        return {
            success: true,
            planId: planId,
            results: executionResults
        };
    }
}

module.exports = Planner;
