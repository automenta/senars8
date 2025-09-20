import TruthValueManager from '../TruthValueManager.js';
import {createModusPonensRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {createModuleErrorHandler} from '../../utils/common.js';

const errorHandler = createModuleErrorHandler('modus-ponens-rule');

export default createModusPonensRule(
    'Modus Ponens',
    (parsed1, _parsed2) => errorHandler.safeSync(
        () => Term.termKey(parsed1.predicate),
        'build-term-key',
        null
    ),
    TruthValueManager.deduce
);
