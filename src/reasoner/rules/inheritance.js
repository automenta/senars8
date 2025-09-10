import TruthValueManager from '../TruthValueManager.js';
import {createTransitiveInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';

export default createTransitiveInheritanceRule(
    'inheritance',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.predicate
    }),
    TruthValueManager.deduce
);
