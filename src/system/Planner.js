import Planners from '../reasoner/index.js';
import Plan from './Plan.js';
import {debug, info, warn} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/unifiedErrorHandler.js';

const errorHandler = createUnifiedErrorHandler('Planner');

class Planner {
    constructor(memory, lm, actionExecutor, configManager) {
        if (!memory || !lm || !actionExecutor) {
            throw new Error('Planner requires memory, lm, and actionExecutor instances.');
        }

        const strategyName = configManager.getString('planner.strategy', 'HTN');
        const PlannerClass = Planners[`${strategyName}Planner`];
        if (!PlannerClass) {
            throw new Error(`Unknown planner strategy: ${strategyName}`);
        }

        this.strategy = new PlannerClass(memory, lm, configManager);
        this.actionExecutor = actionExecutor;
        this.planCache = new Map();
        this.lm = lm;
        info(`Planner initialized with strategy: ${strategyName}`);
    }

    async createPlan(goalTask, failedPlan = null) {
        return await errorHandler.execute(async () => {
            const goalKey = goalTask.termKey;
            debug(`Creating plan for goal: ${goalKey}`);

            const cachedPlan = this._getcachedPlan(goalKey, failedPlan);
            if (cachedPlan) return cachedPlan;

            let planSteps = await this._generateNewPlan(goalTask) || await this._handleEmptyPlan(goalTask, failedPlan);
            if (!planSteps) {
                warn(`No plan could be created for goal: ${goalKey}`);
                return null;
            }

            const plan = new Plan(planSteps, this.actionExecutor, goalKey);
            this.planCache.set(goalKey, plan);
            debug(`Plan created successfully with ${planSteps.length} steps`);
            return plan;
        }, `createPlan for goal ${goalTask.termKey}`, null);
    }

    _getcachedPlan(goalKey, failedPlan) {
        const cachedPlan = this.planCache.get(goalKey);
        if (cachedPlan && cachedPlan !== failedPlan) {
            debug(`Using cached plan for goal: ${goalKey}`);
            return new Plan(cachedPlan.steps, this.actionExecutor, goalKey);
        }
        return null;
    }

    async _generateNewPlan(goalTask) {
        debug(`Generating new plan with strategy for goal: ${goalTask.termKey}`);
        return this.strategy.findPlan(goalTask);
    }

    async _handleEmptyPlan(goalTask, failedPlan) {
        if (this.strategy._isAchieved(this.strategy.memory.getTerm(goalTask.termKey))) {
            debug(`Goal already achieved: ${goalTask.termKey}`);
            return [];
        }
        return this._getLmSuggestion(goalTask, failedPlan);
    }

    async _getLmSuggestion(goalTask, failedPlan) {
        if (!this.lm) return null;
        debug(`Requesting LM plan suggestion for goal: ${goalTask.termKey}`);
        const lmSuggestion = await this.lm.suggestPlanRepair(goalTask, failedPlan?.steps);
        if (lmSuggestion?.length > 0) {
            debug(`LM provided ${lmSuggestion.length} plan steps`);
            return lmSuggestion;
        }
        warn(`LM failed to provide plan suggestion for goal: ${goalTask.termKey}`);
        return null;
    }
}

export default Planner;
