const HTNPlanner = require('../reasoner/HTNPlanner');
const ActionExecutor = require('./ActionExecutor');
const { v4: uuidv4 } = require('uuid');

class Planner {
    constructor(memory, actionExecutor) {
        if (!memory || !actionExecutor) {
            throw new Error('Planner requires memory and actionExecutor instances.');
        }
        this.memory = memory;
        this.htnPlanner = new HTNPlanner(this.memory);
        this.actionExecutor = actionExecutor;
        this.planCache = new Map();
        this.activePlans = new Map();
    }

    async planAndExecute(goalTask) {
        const plan = await this.createPlan(goalTask);
        if (!plan) {
            return { success: false, error: 'No plan found' };
        }
        return this.executePlan(plan);
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
        this.activePlans.set(planId, plan);

        const executionResults = [];
        for (const term of plan) {
            const action = this.parseAction(term);
            if (!action) {
                console.error(`Could not parse action from term: ${term.key}`);
                continue;
            }

            const result = await this.actionExecutor.execute(action);
            executionResults.push({ action: action.name, result });

            if (!result.success) {
                this.activePlans.delete(planId);
                return {
                    success: false,
                    planId,
                    error: `Plan failed at action ${action.name}`,
                    results: executionResults,
                };
            }
        }

        this.activePlans.delete(planId);
        return { success: true, planId, results: executionResults };
    }

    parseAction(term) {
        if (term.type === 'Atomic') {
            return { name: term.key, parameters: [] };
        }

        const isCompound = term.type === 'SequentialConjunction' || term.type === 'Conjunction';
        if (isCompound && term.terms.length > 0) {
            const [nameTerm, ...paramTerms] = term.terms;
            return {
                name: nameTerm.key,
                parameters: paramTerms.map(t => t.key),
            };
        }

        console.warn(`Cannot parse action from term of type ${term.type}: ${term.key}`);
        return null;
    }
}

module.exports = Planner;
