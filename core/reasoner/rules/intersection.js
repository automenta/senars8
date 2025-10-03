import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';

export default createBinaryInheritanceRule(
    'intersection',
    (parsed1, parsed2) => {
        // Ensure both subjects exist before creating the conjunction
        if (!parsed1.subject || !parsed2.subject) return '';
        
        return Term.termKey({
            type: 'Inheritance',
            subject: {
                type: 'Conjunction', 
                terms: [parsed1.subject, parsed2.subject]
            },
            predicate: parsed1.predicate
        });
    },
    TruthValueManager.induce
);
