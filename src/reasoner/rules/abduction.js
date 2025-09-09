const Term = require('../../core/Term');
const TruthValueManager = require('../TruthValueManager');
const {createBinaryInheritanceRule} = require('./rule-factories');

module.exports = createBinaryInheritanceRule(
    'abduction',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: parsed2.subject,
        predicate: parsed1.subject
    }),
    TruthValueManager.abduce
);
