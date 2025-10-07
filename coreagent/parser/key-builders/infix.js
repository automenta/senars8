import {OP, REL} from '../../../core/config/constants.js';
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
    [OP.OPERATION]: (pTerm, silent) => {
        const opName = termKey(pTerm.subject, silent);
        if (pTerm.predicate && pTerm.predicate.type === OP.PRODUCT && Array.isArray(pTerm.predicate.terms)) {
            if (pTerm.predicate.terms.length === 0) {
                // No arguments: opName()
                return `${opName}()`;
            } else {
                // With arguments: opName(arg1, arg2, ...)
                const args = pTerm.predicate.terms.map(arg => termKey(arg, silent)).join(',');
                return `${opName}(${args})`;
            }
        } else {
            // Fallback - should not happen with correct structure
            return `${opName}()`;
        }
    },
});