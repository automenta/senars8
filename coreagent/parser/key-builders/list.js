import {OP, REL} from '../../config/constants.js';
import {listOp, termList} from './helpers.js';

export default (termKey) => ({
    [OP.CONJUNCTION]: (pTerm, silent) => listOp(termKey, REL.CONJUNCTION, pTerm, silent),
    [OP.DISJUNCTION]: (pTerm, silent) => listOp(termKey, REL.DISJUNCTION, pTerm, silent),
    [OP.SEQUENTIAL_CONJUNCTION]: (pTerm, silent) => listOp(termKey, REL.SEQUENTIAL_CONJUNCTION, pTerm, silent),
    [OP.PARALLEL_CONJUNCTION]: (pTerm, silent) => listOp(termKey, REL.PARALLEL_CONJUNCTION, pTerm, silent),
    [OP.EXTENSIONAL_DIFFERENCE]: (pTerm, silent) => listOp(termKey, REL.EXTENSIONAL_DIFFERENCE, pTerm, silent),
    [OP.INTENSIONAL_DIFFERENCE]: (pTerm, silent) => listOp(termKey, REL.INTENSIONAL_DIFFERENCE, pTerm, silent),
    [OP.PRODUCT]: (pTerm, silent) => listOp(termKey, REL.PRODUCT, pTerm, silent),
    [OP.EXTENSIONAL_SET]: (pTerm, silent) => `{${termList(termKey, pTerm.terms || [], silent)}}`,
    [OP.INTENSIONAL_SET]: (pTerm, silent) => `[${termList(termKey, pTerm.terms || [], silent)}]`,
});