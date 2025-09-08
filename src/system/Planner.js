const Planners = require('../reasoner');
const Plan = require('./Plan');

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
        this.actionExecutor = actionExecutor;
        this.planCache = new Map();
        this.lm = lm;
    }

    async createPlan(goalTask, failedPlan = null) {
        const goalKey = goalTask.termKey;
        const cachedPlan = this.planCache.get(goalKey);

        if (cachedPlan && cachedPlan !== failedPlan) {
            return new Plan(cachedPlan.steps, this.actionExecutor);
        }

        let planSteps = await this.strategy.findPlan(goalTask);

        if (!planSteps || planSteps.length === 0) {
            const isAchieved = this.strategy._isAchieved(this.strategy.memory.getTerm(goalTask.termKey));
            if (isAchieved) {
                return new Plan([], this.actionExecutor); // Goal already achieved
            }

            // If no plan found, try to use LM for a suggestion
            if (this.lm) {
                const lmSuggestion = await this.lm.suggestPlanRepair(goalTask, failedPlan ? failedPlan.steps : null);
                if (lmSuggestion && lmSuggestion.length > 0) {
                    planSteps = lmSuggestion;
                }
            }
        }

        if (!planSteps || planSteps.length === 0) {
            return null; // No plan could be created
        }

        const plan = new Plan(planSteps, this.actionExecutor);
        this.planCache.set(goalKey, plan);
        return plan;
    }
}

module.exports = Planner;
