const Planners = require('../reasoner');
const Plan = require('./Plan');
const {info, error, debug, warn} = require('../utils/logger');
const {handleErrorWithDefault} = require('../utils/error-handler');

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
        info(`Planner initialized with strategy: ${strategyName}`);
    }

    async createPlan(goalTask, failedPlan = null) {
        try {
            const goalKey = goalTask.termKey;
            debug(`Creating plan for goal: ${goalKey}`);
            
            const cachedPlan = this.planCache.get(goalKey);

            if (cachedPlan && cachedPlan !== failedPlan) {
                debug(`Using cached plan for goal: ${goalKey}`);
                return new Plan(cachedPlan.steps, this.actionExecutor);
            }

            debug(`Generating plan for goal: ${goalKey}`);
            let planSteps = await this.strategy.findPlan(goalTask);

            if (!planSteps || planSteps.length === 0) {
                const isAchieved = this.strategy._isAchieved(this.strategy.memory.getTerm(goalTask.termKey));
                if (isAchieved) {
                    debug(`Goal already achieved: ${goalKey}`);
                    return new Plan([], this.actionExecutor); // Goal already achieved
                }

                // If no plan found, try to use LM for a suggestion
                if (this.lm) {
                    debug(`Requesting LM plan suggestion for goal: ${goalKey}`);
                    const lmSuggestion = await this.lm.suggestPlanRepair(goalTask, failedPlan ? failedPlan.steps : null);
                    if (lmSuggestion && lmSuggestion.length > 0) {
                        debug(`LM provided ${lmSuggestion.length} plan steps`);
                        planSteps = lmSuggestion;
                    } else {
                        warn(`LM failed to provide plan suggestion for goal: ${goalKey}`);
                    }
                }
            }

            if (!planSteps || planSteps.length === 0) {
                warn(`No plan could be created for goal: ${goalKey}`);
                return null; // No plan could be created
            }

            const plan = new Plan(planSteps, this.actionExecutor);
            this.planCache.set(goalKey, plan);
            debug(`Plan created successfully with ${planSteps.length} steps`);
            return plan;
        } catch (err) {
            error(`Error creating plan for goal ${goalTask.termKey}:`, err);
            return handleErrorWithDefault(err, 'Plan creation error', null);
        }
    }
}

module.exports = Planner;
