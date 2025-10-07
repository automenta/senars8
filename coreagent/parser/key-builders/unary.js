import {OP, REL} from '../../../core/config/constants.js';
import {unaryOp} from './helpers.js';

export default (termKey) => ({
    [OP.NEGATION]: (pTerm, silent) => unaryOp(termKey, REL.NEGATION, pTerm, silent),
    [OP.ALWAYS]: (pTerm, silent) => unaryOp(termKey, REL.ALWAYS, pTerm, silent),
    [OP.EVENTUALLY]: (pTerm, silent) => unaryOp(termKey, REL.EVENTUALLY, pTerm, silent),
    [OP.NEXT]: (pTerm, silent) => unaryOp(termKey, REL.NEXT, pTerm, silent),
    [OP.PREVIOUS]: (pTerm, silent) => unaryOp(termKey, REL.PREVIOUS, pTerm, silent),
});