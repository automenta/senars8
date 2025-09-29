import {OP, REL} from '../../config/constants.js';
import {termKeyInfix} from './helpers.js';

export default (termKey) => ({
    [OP.INHERITANCE]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.INHERITANCE, silent),
    [OP.IMPLICATION]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.IMPLICATION, silent),
    [OP.EQUIVALENCE]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.EQUIVALENCE, silent),
    [OP.SIMILARITY]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.SIMILARITY, silent),
    [OP.INSTANCE]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.INSTANCE, silent),
    [OP.PROPERTY]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.PROPERTY, silent),
    [OP.PREDICTIVE_IMPLICATION]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.PREDICTIVE_IMPLICATION, silent),
    [OP.RETROSPECTIVE_IMPLICATION]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.RETROSPECTIVE_IMPLICATION, silent),
    [OP.CONCURRENT_IMPLICATION]: (pTerm, silent) => termKeyInfix(termKey, pTerm, REL.CONCURRENT_IMPLICATION, silent),
    [OP.UNTIL]: (pTerm, silent) => termKeyInfix(termKey, pTerm, 'until', silent),
    [OP.SINCE]: (pTerm, silent) => termKeyInfix(termKey, pTerm, 'since', silent),
});