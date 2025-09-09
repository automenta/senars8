const {createUnaryInheritanceRule} = require('./rule-factories');
const Term = require('../../core/Term');

module.exports = createUnaryInheritanceRule(
    'contraposition',
    (parsed1) => Term.buildTermKey({
        type: 'Inheritance',
        subject: `(--,${Term.buildTermKey(parsed1.predicate)})`,
        predicate: `(--,${Term.buildTermKey(parsed1.subject)})`
    }),
    (truthValue) => truthValue // Truth value remains the same
);