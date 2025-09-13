import {CONTRADICTION_TYPES} from '../../contradiction-types.js';
import {analyzeSetLikeConflict} from './utils.js';

function analyzeSetConflict(task1, task2, parsed1, parsed2) {
    return analyzeSetLikeConflict(task1, task2, parsed1, parsed2, 'ExtensionalSet', CONTRADICTION_TYPES.SET_CONFLICT, 'Set conflict');
}

export default analyzeSetConflict;
