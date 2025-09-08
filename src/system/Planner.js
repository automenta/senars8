const { v4: uuidv4 } = require('uuid');
const Action = require('../core/Action');

class PlanExecutor {
    constructor(actionExecutor) {
        this.actionExecutor = actionExecutor;
    }

    async executeAction(term) {
        const action = this._parseAction(term);
        if (!action) {
            return { success: false, error: `Could not parse action: ${term.key}` };
        }
        const result = await this.actionExecutor.execute(action);
        return { ...result, action: action.name };
    }

    _parseAction(term) {
        switch (term.type) {
            case 'Atomic':
                return new Action(term.key);
            case 'SequentialConjunction':
            case 'Conjunction':
                if (term.terms.length > 0) {
                    const [nameTerm, ...paramTerms] = term.terms;
                    return new Action(nameTerm.key, paramTerms.map(t => t.key));
                }
                return null;
            default:
                return null;
        }
    }
}

const Planners = require('../reasoner');

class Planner {
    constructor(memory, lm, actionExecutor, config = {}) {
        if (!memory || !lm || !actionExecutor) {
            throw new Error('Planner requires memory, lm, and actionExecutor instances.');
        }

        const strategyName = config.strategy || 'HTN';
        const PlannerClass = Planners[strategyName + 'Planner'];
        if (!PlannerClass) {
            throw new Error(`Unknown planner strategy: ${strategyName}`);
        }

        this.strategy = new PlannerClass(memory, lm, config.plannerConfig);
        this.executor = new PlanExecutor(actionExecutor);
        this.planCache = new Map();
    }

    async planAndExecute(goalTask, maxAttempts = 3) {
        let attempts = 0;
        let lastFailedPlan = null;

        while (attempts < maxAttempts) {
            attempts++;
            const plan = await this.createPlan(goalTask, lastFailedPlan);

            if (!plan || plan.length === 0) {
                const isAchieved = this.strategy._isAchieved(this.strategy.memory.getTerm(goalTask.termKey));
                if (isAchieved) return { success: true, planId: null, results: ['Goal already achieved'] };

                if (this.strategy.lm) {
                    const lmSuggestion = await this.strategy.lm.suggestPlanRepair(goalTask, lastFailedPlan);
                    if (lmSuggestion && lmSuggestion.length > 0) {
                        const executionResult = await this._executePlan(lmSuggestion);
                        if (executionResult.success) return executionResult;
                    }
                }
                return { success: false, error: 'No plan found, and LM could not repair.' };
            }

            const executionResult = await this._executePlan(plan);
            if (executionResult.success) {
                return executionResult;
            }

            lastFailedPlan = plan;
            this.planCache.delete(goalTask.termKey);
        }

        return { success: false, error: `Plan failed after ${maxAttempts} attempts` };
    }

    async _executePlan(plan) {
        const planId = uuidv4();
        const results = [];
        for (const step of plan) {
            const result = await this.executor.executeAction(step);
            results.push(result);

            if (!result.success) {
                return { success: false, planId, error: `Plan failed at action ${step.key}`, results };
            }
        }
        return { success: true, planId, results };
    }

    async createPlan(goalTask, failedPlan = null) {
        const goalKey = goalTask.termKey;
        const cachedPlan = this.planCache.get(goalKey);

        if (cachedPlan && cachedPlan !== failedPlan) {
            return cachedPlan;
        }

        const plan = await this.strategy.findPlan(goalTask);
        if (plan) {
            this.planCache.set(goalKey, plan);
        }
        return plan;
    }
}

module.exports = Planner;
