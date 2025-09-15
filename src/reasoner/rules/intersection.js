import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import { createBinaryInheritanceRule } from './rule-factories.js';

export default createBinaryInheritanceRule(
    'intersection',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: `(&, ${Term.buildTermKey(parsed1.subject)}, ${Term.buildTermKey(parsed2.subject)})`,
        predicate: parsed1.predicate
    }),
    TruthValueManager.induce
);
