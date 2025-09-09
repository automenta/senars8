const Term = require('../../core/Term');
const TruthValueManager = require('../TruthValueManager');
const {createBinaryInheritanceRule} = require('./rule-factories');

module.exports = createBinaryInheritanceRule(
    'induction',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.subject
    }),
    TruthValueManager.induce
);
