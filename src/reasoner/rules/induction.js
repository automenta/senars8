import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';

export default createBinaryInheritanceRule(
    'induction',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.subject
    }),
    TruthValueManager.induce
);
