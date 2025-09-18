import TruthValueManager from '../TruthValueManager.js';
import {createTransitiveInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('inheritance-rule');

/**
 * Inheritance Rule
 *
 * Performs transitive inheritance inference:
 * If A --> B and B --> C, then A --> C
 *
 * Truth value is calculated using deduction.
 */
export default createTransitiveInheritanceRule(
    'Inheritance Transitivity',
    (parsed1, parsed2) => {
        return errorHandler.safeSync(() => Term.termKey({
            type: 'Inheritance',
            subject: parsed1.subject,
            predicate: parsed2.predicate
        }), 'build-term-key', null);
    },
    TruthValueManager.deduce
);
