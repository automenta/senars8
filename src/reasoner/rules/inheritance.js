import TruthValueManager from '../TruthValueManager.js';
import {createTransitiveInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import {createUnifiedErrorHandler} from '../../utils/unifiedErrorHandler.js';

const errorHandler = createUnifiedErrorHandler('inheritance-rule');

export default createTransitiveInheritanceRule(
    'Inheritance Transitivity',
    (parsed1, parsed2) => errorHandler.executeSync(
        () => Term.termKey({
            type: 'Inheritance',
            subject: parsed1.subject,
            predicate: parsed2.predicate
        }),
        'build-term-key',
        null
    ),
    TruthValueManager.deduce
);
