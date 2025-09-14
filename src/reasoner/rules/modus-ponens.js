import TruthValueManager from '../TruthValueManager.js';
import {createModusPonensRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {error} from '../../utils/logger.js';

/**
 * Modus Ponens Rule
 * 
 * Performs modus ponens inference:
 * If A ==> B and A, then B
 * 
 * Truth value is calculated using deduction.
 */
export default createModusPonensRule(
    'Modus Ponens',
    (parsed1, parsed2) => {
        try {
            return Term.buildTermKey(parsed1.predicate);
        } catch (error) {
            error('Error building modus ponens term:', error);
            return null;
        }
    },
    TruthValueManager.deduce
);
