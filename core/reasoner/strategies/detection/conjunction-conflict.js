import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeNegationConflict} from './utils.js';

function analyzeConjunctionConflict(task1, task2, parsed1, parsed2) {
    return analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Conjunction', CONTRADICTION_TYPES.CONJUNCTION_CONFLICT);
}

export default analyzeConjunctionConflict;
