import {generatePlanId} from '../utils/IdGenerator.js';
import Action from '../core/Action.js';

class Plan {
    constructor(steps, actionExecutor, goalKey) {
        if (!steps || !actionExecutor) {
            throw new Error('Plan requires steps and an actionExecutor instance.');
        }
        this.id = generatePlanId(goalKey);
        this.steps = steps;
        this.actionExecutor = actionExecutor;
    }

    async execute() {
        const results = [];
        for (const step of this.steps) {
            const result = await this._executeStep(step);
            results.push(result);

            if (!result.success) {
                return {
                    success: false,
                    planId: this.id,
                    error: `Plan failed at action ${step.key}`,
                    results
                };
            }
        }
        return {
            success: true,
            planId: this.id,
            results
        };
    }

    async _executeStep(term) {
        const action = this._parseAction(term);
        if (!action) {
            return {
                success: false,
                error: `Could not parse action: ${term.key}`
            };
        }
        const result = await this.actionExecutor.execute(action);
        return {
            ...result,
            action: action.name
        };
    }

    _parseAction(term) {
        if (term.type === 'Atomic') {
            return new Action(term.key);
        }
        if ((term.type === 'SequentialConjunction' || term.type === 'Conjunction') && term.terms.length > 0) {
            const [nameTerm, ...paramTerms] = term.terms;
            return new Action(nameTerm.key, paramTerms.map(t => t.key));
        }
        return null;
    }
}

export default Plan;
