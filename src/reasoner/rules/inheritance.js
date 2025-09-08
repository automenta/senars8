const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');
const {isBelief} = require('../../utils/task-utils');

module.exports = createRule({
    name: 'inheritance',
    arity: 2,
    operands: [
        (task) => isBelief(task),
        (task) => isBelief(task),
    ],
    condition: (parsed1, parsed2) =>
        parsed1?.type === 'Inheritance' &&
        parsed2?.type === 'Inheritance' &&
        parsed1.predicate.key === parsed2.subject.key,
    action: (parsed1, parsed2, task1, task2) => {
        const newTermKey = buildTermKey({
            type: 'Inheritance',
            subject: parsed1.subject,
            predicate: parsed2.predicate
        });
        const newTruthValue = TruthValueManager.deduce(task1.state.truthValue, task2.state.truthValue);
        return {newTermKey, newTruthValue};
    },
});
