const Term = require('../../core/Term');
const TruthValueManager = require('../TruthValueManager');
const {createBinaryInheritanceRule} = require('./rule-factories');

module.exports = createBinaryInheritanceRule(
    'union',
    (parsed1, parsed2) => Term.buildTermKey({
        type: 'Inheritance',
        subject: `(||, ${Term.buildTermKey(parsed1.subject)}, ${Term.buildTermKey(parsed2.subject)})`,
        predicate: parsed1.predicate
    }),
    TruthValueManager.abduce
);