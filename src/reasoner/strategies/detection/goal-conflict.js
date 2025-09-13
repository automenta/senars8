import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import analyzeDirectNegation from './direct-negation.js';

function analyzeGoalConflict(task1, task2, parsed1, parsed2) {
    if (task1.punctuation !== '!' || task2.punctuation !== '!') return null;

    // A goal conflict is a direct negation between two goals.
    const isDirectNegation = analyzeDirectNegation(task1, task2, parsed1, parsed2);

    return isDirectNegation ? {
        type: CONTRADICTION_TYPES.GOAL_CONFLICT,
        details: `Direct goal conflict: "${task1.termKey}" vs "${task2.termKey}"`
    } : null;
}

export default analyzeGoalConflict;
