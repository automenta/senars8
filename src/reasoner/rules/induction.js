import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';
import {error as logError} from '../../utils/logger.js';

/**
 * Induction Rule
 *
 * Performs inductive inference:
 * If M --> P and M --> S, then S --> P
 *
 * Truth value is calculated using induction.
 */
export default createBinaryInheritanceRule(
    'Induction',
    (parsed1, parsed2) => {
        try {
            return Term.termKey({
                type: 'Inheritance',
                subject: parsed1.subject,
                predicate: parsed2.subject
            });
        } catch (err) {
            logError('Error building induction term:', err);
            return null;
        }
    },
    TruthValueManager.induce
);
