import Term from '../../core/Term.js';
import TruthValueManager from '../TruthValueManager.js';
import {createBinaryInheritanceRule} from './rule-factories.js';

export default createBinaryInheritanceRule(
    'union',
    (parsed1, parsed2) => Term.termKey({
        type: 'Inheritance',
        subject: `(||, ${Term.termKey(parsed1.subject)}, ${Term.termKey(parsed2.subject)})`,
        predicate: parsed1.predicate
    }),
    TruthValueManager.abduce
);
