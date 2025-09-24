import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeNegationConflict} from './utils.js';

function analyzeInheritanceConflict(task1, task2, parsed1, parsed2) {
    return analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Inheritance', CONTRADICTION_TYPES.INHERITANCE_CONFLICT);
}

export default analyzeInheritanceConflict;
