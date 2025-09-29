import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeSetLikeConflict} from './utils.js';

function analyzeIntensionalSetConflict(task1, task2, parsed1, parsed2) {
    return analyzeSetLikeConflict(task1, task2, parsed1, parsed2, 'IntensionalSet', CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT, 'Intensional set conflict');
}

export default analyzeIntensionalSetConflict;
