import TruthValueManager from '../TruthValueManager.js';
import {createTransitiveInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';

export default createTransitiveInheritanceRule(
    'Inheritance Transitivity',
    (parsed1, parsed2) => Term.termKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.predicate
    }),
    TruthValueManager.deduce
);
