const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createBinaryInheritanceRule} = require('./rule-generator');

module.exports = createBinaryInheritanceRule(
    'intersection',
    (parsed1, parsed2) => buildTermKey({
        type: 'Inheritance',
        subject: `(&, ${buildTermKey(parsed1.subject)}, ${buildTermKey(parsed2.subject)})`,
        predicate: parsed1.predicate
    }),
    TruthValueManager.induce
);