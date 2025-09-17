import TruthValueManager from '../TruthValueManager.js';
import {createModusPonensRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('modus-ponens-rule');

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
        return errorHandler.safeSync(() => Term.termKey(parsed1.predicate), 'build-term-key', null);
    },
    TruthValueManager.deduce
);
