import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeNegationConflict} from './utils.js';

function analyzeDisjunctionConflict(task1, task2, parsed1, parsed2) {
    return analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Disjunction', CONTRADICTION_TYPES.DISJUNCTION_CONFLICT);
}

export default analyzeDisjunctionConflict;
