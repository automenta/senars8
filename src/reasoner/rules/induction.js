import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';
import {createModuleErrorHandler} from '../../utils/common.js';

const errorHandler = createModuleErrorHandler('induction-rule');

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
        return errorHandler.safeSync(() => Term.termKey({
            type: 'Inheritance',
            subject: parsed1.subject,
            predicate: parsed2.subject
        }), 'build-term-key', null);
    },
    TruthValueManager.induce
);
