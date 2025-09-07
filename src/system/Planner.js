const { v4: uuidv4 } = require('uuid');

class PlanExecutor {
    constructor(actionExecutor) {
        this.actionExecutor = actionExecutor;
        this.activePlans = new Map();
    }

    async execute(plan) {
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

class Planner {
    constructor(planningStrategy, actionExecutor) {
        if (!planningStrategy || !actionExecutor) {
            throw new Error('Planner requires a planning strategy and an actionExecutor.');
        }
        this.strategy = planningStrategy;
        this.executor = new PlanExecutor(actionExecutor);
        this.planCache = new Map();
    }

    async planAndExecute(goalTask) {
        const plan = await this.createPlan(goalTask);
        return plan ? this.executor.execute(plan) : { success: false, error: 'No plan found' };
    }

    async createPlan(goalTask) {
        const goalKey = goalTask.termKey;
        if (this.planCache.has(goalKey)) {
            return this.planCache.get(goalKey);
        }

        const plan = await this.strategy.findPlan(goalTask);
        if (plan) {
            this.planCache.set(goalKey, plan);
        }
        return plan;
    }
}

module.exports = Planner;
