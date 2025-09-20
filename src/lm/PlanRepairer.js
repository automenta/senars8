import {createModuleErrorHandler} from '../utils/common.js';
import {debug, warn} from '../utils/logger.js';
import {parseTerm} from '../parser/parse-utils.js';
import zod from 'zod';

const errorHandler = createModuleErrorHandler('PlanRepairer');

class PlanRepairer {
    constructor(getGenerationPipeline, createStructuredChain, parseStructuredResult) {
        this._getGenerationPipeline = getGenerationPipeline;
        this._createStructuredChain = createStructuredChain;
        this._parseStructuredResult = parseStructuredResult;
    }

    async suggestPlanRepair(goalTask, failedPlan) {
        if (!goalTask) throw new Error('Goal task is required');

        return await errorHandler.safeAsync(async () => {
            debug(`Suggesting plan repair for goal: ${goalTask.termKey}`);
            await this._getGenerationPipeline();

            const context = this._createPlanRepairContext(goalTask.termKey, failedPlan);
            const chain = this._createStructuredChain(
                `${context}New creative plan:`,
                zod.object({plan: zod.array(zod.string()).describe('A list of Narsese terms for the new plan.')})
            );

            const result = await chain.call({context: ''});
            const parsed = this._parseStructuredResult(result.text);

            if (!parsed?.plan) {
                warn('Plan repair suggestion failed to parse');
                return null;
            }

            const planTerms = parsed.plan.map(parseTerm).filter(Boolean);
            debug(`Plan repair suggested ${planTerms.length} terms`);
            return planTerms;
        }, `suggestPlanRepair for goal: ${goalTask.termKey}`, null);
    }

    _createPlanRepairContext(goal, failedPlan) {
        const failedPlanSteps = failedPlan?.map(t => t.key).join(', ') || 'None';
        return `Goal: ${goal}\nFailed Plan: ${failedPlanSteps}\nThe previous attempt to achieve the goal failed. Please suggest a new sequence of primitive actions to achieve the goal. The new plan should be a list of Narsese terms.`;
    }
}

export default PlanRepairer;
