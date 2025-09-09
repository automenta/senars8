const TruthValueManager = require('../TruthValueManager');
const { createTransitiveInheritanceRule } = require('./rule-factories');
const Term = require('../../core/Term');

module.exports = createTransitiveInheritanceRule(
    'inheritance',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.predicate
    }),
    TruthValueManager.deduce
);
