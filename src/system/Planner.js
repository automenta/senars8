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
            const action = this.parseAction(term);
            if (!action) {
                // If parsing fails, we can either skip or fail the plan
                console.error(`Could not parse action from term: ${term.key}`);
                continue;
            }

            const result = await actionExecutor.executeAction({ name: action.name, parameters: action.parameters });
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

    parseAction(term) {
        const isConjunction = term.type === 'SequentialConjunction' || term.type === 'Conjunction';

        // A primitive action is expected to be a conjunction
        // e.g., (&, GoTo, room, kitchen) or (&/, GoTo, room, kitchen)
        if (!isConjunction || term.terms.length < 1) {
            // Or it could be a simple term for an action with no parameters
            if (term.type === 'Atomic') {
                return { name: term.key, parameters: [] };
            }
            return null;
        }

        // The first term is the action name, the rest are parameters.
        const name = term.terms[0].key;
        const parameters = term.terms.slice(1).map(t => t.key);

        return { name, parameters };
    }
}

module.exports = Planner;
