const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createBinaryInheritanceRule} = require('./rule-generator');

module.exports = createBinaryInheritanceRule(
    'abduction',
    (parsed1, parsed2) => buildTermKey({
        type: 'Inheritance',
        subject: parsed2.subject,
        predicate: parsed1.subject
    }),
    TruthValueManager.abduce
);
