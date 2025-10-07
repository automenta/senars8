import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {debug, warn} from '../utils/logger.js';
import {parseTerm} from '../parser/parse-utils.js';
import zod from 'zod';

const errorHandler = createUnifiedErrorHandler('PlanRepairer');

class PlanRepairer {
    constructor(getGenerationPipeline, createStructuredChain, parseStructuredResult) {
        this._getGenerationPipeline = getGenerationPipeline;
        this._createStructuredChain = createStructuredChain;
        this._parseStructuredResult = parseStructuredResult;
    }

    async suggestPlanRepair(goalTask, failedPlan) {
        if (!goalTask) throw new Error('Goal task is required');

        debug(`Suggesting plan repair for goal: ${goalTask.termKey}`);
        
        const context = this._createPlanRepairContext(goalTask.termKey, failedPlan);
        
        try {
            // The _createStructuredChain might fail if the underlying LLM can't be initialized
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
        } catch (error) {
            // Suppress ALL LLM-related errors and just return null
            return null;
        }
    }

    _createPlanRepairContext(goal, failedPlan) {
        let failedPlanSteps = 'None';
        if (Array.isArray(failedPlan)) {
            failedPlanSteps = failedPlan.map(t => t?.key || t).filter(Boolean).join(', ') || 'None';
        } else if (failedPlan != null) {
            // If failedPlan is not an array but is truthy, try to get a string representation
            failedPlanSteps = String(failedPlan);
        }
        return `Goal: ${goal}\nFailed Plan: ${failedPlanSteps}\nThe previous attempt to achieve the goal failed. Please suggest a new sequence of primitive actions to achieve the goal. The new plan should be a list of Narsese terms.`;
    }
}

export default PlanRepairer;
