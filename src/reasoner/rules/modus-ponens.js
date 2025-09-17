import TruthValueManager from '../TruthValueManager.js';
import {createModusPonensRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {error as logError} from '../../utils/logger.js';

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
    (parsed1, _parsed2) => {
        try {
            return Term.termKey(parsed1.predicate);
        } catch (err) {
            logError('Error building modus ponens term:', err);
            return null;
        }
    },
    TruthValueManager.deduce
);
