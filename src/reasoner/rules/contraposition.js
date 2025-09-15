import {createUnaryInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {validateTermKey} from '../../parser/parse-utils.js';

export default createUnaryInheritanceRule(
    'contraposition',
    parsed1 => {
        // Validate that we have valid subject and predicate
        if (!parsed1.subject || !parsed1.predicate) {
            return null;
        }
        
        const subjectKey = Term.buildTermKey(parsed1.subject);
        const predicateKey = Term.buildTermKey(parsed1.predicate);
        
        // Check if the generated keys are valid and non-empty
        if (!subjectKey || !predicateKey || subjectKey.length === 0 || predicateKey.length === 0) {
            return null;
        }
        
        // Prevent generating invalid contrapositives where the components would be malformed
        // Check if subject or predicate are simple atomic terms (most common case)
        // For atomic terms like "a", the negation `(--,a)` is valid
        // But for complex terms, we need to be more careful
        
        // If the subject or predicate is an atomic term, we can negate it safely
        // Otherwise, we need to check if negating it would create a valid term
        const negatedSubject = `(--,${predicateKey})`;
        const negatedPredicate = `(--,${subjectKey})`;
        
        // Validate that our negated terms are non-trivial
        // A valid negation should have more than just the negation operator
        if (negatedSubject.length <= 5 || negatedPredicate.length <= 5) { // 5 is length of "(--,)"
            return null;
        }
        
        // Try to build the term key and validate it
        try {
            const result = Term.buildTermKey({
                type: 'Inheritance',
                subject: negatedSubject,
                predicate: negatedPredicate
            });
            
            // Additional validation to ensure we're not creating malformed terms
            if (!result || result.length === 0) {
                return null;
            }
            
            // Use the existing validation function
            if (!validateTermKey(result)) {
                return null;
            }
            
            return result;
        } catch (e) {
            // If building the term key fails, return null
            return null;
        }
    },
    truthValue => truthValue // Truth value remains the same
);
