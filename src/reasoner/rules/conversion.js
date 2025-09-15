import {createUnaryInheritanceRule} from './rule-factories.js';
import Term from '../../core/Term.js';
import config from '../../config.js';

export default createUnaryInheritanceRule(
    'conversion',
    parsed1 => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.predicate,
        predicate: parsed1.subject
    }),
    truthValue => ({
        frequency: truthValue.frequency,
        confidence: truthValue.confidence * config.temporal.TEMPORAL_RELATIONSHIP_CONFIDENCE
    })
);
