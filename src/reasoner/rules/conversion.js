const {createUnaryInheritanceRule} = require('./rule-factories');
const Term = require('../../core/Term');
const config = require('../../config');

module.exports = createUnaryInheritanceRule(
    'conversion',
    (parsed1) => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.predicate,
        predicate: parsed1.subject
    }),
    (truthValue) => ({
        frequency: truthValue.frequency,
        confidence: truthValue.confidence * config.temporal.TEMPORAL_RELATIONSHIP_CONFIDENCE
    })
);