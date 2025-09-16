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

        // Create negated terms properly
        const negatedSubject = {
            type: 'Negation',
            term: parsed1.predicate  // Use the original parsed predicate
        };
        const negatedPredicate = {
            type: 'Negation',
            term: parsed1.subject    // Use the original parsed subject
        };

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
        } catch {
            // If building the term key fails, return null
            return null;
        }
    },
    truthValue => truthValue // Truth value remains the same
);
