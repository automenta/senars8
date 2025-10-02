import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';

export default createBinaryInheritanceRule(
    'abduction',
    (parsed1, parsed2) => Term.termKey({
        type: 'Inheritance',
        subject: parsed2.subject,
        predicate: parsed1.subject
    }),
    TruthValueManager.abduce
);
