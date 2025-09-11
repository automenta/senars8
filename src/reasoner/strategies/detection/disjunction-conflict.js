import { CONTRADICTION_TYPES } from '../../contradiction-types.js';
import { analyzeCompoundTermConflict } from './utils.js';

function analyzeDisjunctionConflict(task1, task2, parsed1, parsed2) {
    return analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, 'Disjunction', CONTRADICTION_TYPES.DISJUNCTION_CONFLICT);
}

export default analyzeDisjunctionConflict;
