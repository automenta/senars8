import {createUnaryInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';

export default createUnaryInheritanceRule(
    'contraposition',
    parsed1 => Term.buildTermKey({
        type: 'Inheritance',
        subject: `(--,${Term.buildTermKey(parsed1.predicate)})`,
        predicate: `(--,${Term.buildTermKey(parsed1.subject)})`
    }),
    truthValue => truthValue // Truth value remains the same
);
