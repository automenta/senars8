import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';

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
            return Term.buildTermKey({
                type: 'Inheritance',
                subject: parsed1.subject,
                predicate: parsed2.subject
            });
        } catch (error) {
            console.error('Error building induction term:', error);
            return null;
        }
    },
    TruthValueManager.induce
);
