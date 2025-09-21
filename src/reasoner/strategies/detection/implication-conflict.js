import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeNegationConflict} from './utils.js';

function analyzeImplicationConflict(task1, task2, parsed1, parsed2) {
    return analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Implication', CONTRADICTION_TYPES.IMPLICATION_CONFLICT);
}

export default analyzeImplicationConflict;
