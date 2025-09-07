const HTNPlanner = require('../reasoner/HTNPlanner');
const { v4: uuidv4 } = require('uuid');

class Planner {
    constructor(memory, actionExecutor) {
        if (!memory || !actionExecutor) {
            throw new Error('Planner requires memory and actionExecutor instances.');
        }
        this.htnPlanner = new HTNPlanner(memory);
        this.actionExecutor = actionExecutor;
        this.planCache = new Map();
        this.activePlans = new Map();
    }

    async planAndExecute(goalTask) {
        const plan = await this.createPlan(goalTask);
        return plan ? this.executePlan(plan) : { success: false, error: 'No plan found' };
    }

    async createPlan(goalTask) {
        const goalKey = goalTask.termKey;
        if (this.planCache.has(goalKey)) {
            return this.planCache.get(goalKey);
        }

        const plan = await this.htnPlanner.findPlan(goalTask);
        if (plan) {
            this.planCache.set(goalKey, plan);
        }
        return plan;
    }

    async executePlan(plan) {
        const planId = uuidv4();
        this.activePlans.set(planId, { id: planId, steps: plan });

        const results = [];
        for (const term of plan) {
            const action = this._parseAction(term);
            if (!action) {
                this.activePlans.delete(planId);
                return { success: false, planId, error: `Could not parse action: ${term.key}`, results };
            }

            const result = await this.actionExecutor.execute(action);
            results.push({ action: action.name, result });

            if (!result.success) {
                this.activePlans.delete(planId);
                return { success: false, planId, error: `Plan failed at action ${action.name}`, results };
            }
        }

        this.activePlans.delete(planId);
        return { success: true, planId, results };
    }

    _parseAction(term) {
        switch (term.type) {
            case 'Atomic':
                return { name: term.key, parameters: [] };
            case 'SequentialConjunction':
            case 'Conjunction':
                if (term.terms.length > 0) {
                    const [nameTerm, ...paramTerms] = term.terms;
                    return {
                        name: nameTerm.key,
                        parameters: paramTerms.map(t => t.key),
                    };
                }
                return null;
            default:
                return null;
        }
    }
}

module.exports = Planner;
