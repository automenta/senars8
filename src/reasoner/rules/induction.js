import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('induction-rule');

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
        return errorHandler.executeSync(() => Term.termKey({
            type: 'Inheritance',
            subject: parsed1.subject,
            predicate: parsed2.subject
        }), 'build-term-key', null);
    },
    TruthValueManager.induce
);
