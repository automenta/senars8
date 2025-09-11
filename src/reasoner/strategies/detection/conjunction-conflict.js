import { CONTRADICTION_TYPES } from '../../contradiction-types.js';
import { analyzeCompoundTermConflict } from './utils.js';

function analyzeConjunctionConflict(task1, task2, parsed1, parsed2) {
    return analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, 'Conjunction', CONTRADICTION_TYPES.CONJUNCTION_CONFLICT);
}

export default analyzeConjunctionConflict;
