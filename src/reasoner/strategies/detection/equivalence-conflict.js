import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeNegationConflict} from './utils.js';

function analyzeEquivalenceConflict(task1, task2, parsed1, parsed2) {
    return analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Equivalence', CONTRADICTION_TYPES.EQUIVALENCE_CONFLICT);
}

export default analyzeEquivalenceConflict;
