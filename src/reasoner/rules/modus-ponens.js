import TruthValueManager from '../TruthValueManager.js';
import {createModusPonensRule} from './rule-factories.js';
import Term from '../../core/Term.js';

export default createModusPonensRule(
    'modus-ponens',
    (parsed1, parsed2) => Term.buildTermKey(parsed1.predicate),
    TruthValueManager.deduce
);
