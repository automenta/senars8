import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeNegationConflict} from './utils.js';

function analyzeDirectNegation(task1, task2, parsed1, parsed2) {
    return analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Statement', CONTRADICTION_TYPES.DIRECT_NEGATION);
}

export default analyzeDirectNegation;
