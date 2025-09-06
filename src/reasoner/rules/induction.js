const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createBinaryInheritanceRule} = require('./rule-generator');

module.exports = createBinaryInheritanceRule(
    'induction',
    (parsed1, parsed2) => buildTermKey({
        type: 'Inheritance',
        subject: parsed1.subject,
        predicate: parsed2.subject
    }),
    TruthValueManager.induce
);
