import TruthValueManager from '../TruthValueManager.js';
import {createTransitiveInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {error as logError} from '../../utils/logger.js';

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
        try {
            return Term.buildTermKey({
                type: 'Inheritance',
                subject: parsed1.subject,
                predicate: parsed2.predicate
            });
        } catch (err) {
            logError('Error building inheritance term:', err);
            return null;
        }
    },
    TruthValueManager.deduce
);
