import TruthValueManager from '../TruthValueManager.js';
import {createModusPonensRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('modus-ponens-rule');

export default createModusPonensRule(
    'Modus Ponens',
    (parsed1, _parsed2) => errorHandler.executeSync(
        () => Term.termKey(parsed1.predicate),
        'build-term-key',
        null
    ),
    TruthValueManager.deduce
);
