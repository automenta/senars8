const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');
const {isBelief} = require('../../utils/task-utils');

module.exports = createRule({
    name: 'analogy',
    arity: 3,
    operands: [
        (task) => isBelief(task),
        (task) => isBelief(task),
        (task) => isBelief(task),
    ],
    condition: (parsed1, parsed2, parsed3) =>
        parsed1?.type === 'Inheritance' &&
        parsed2?.type === 'Inheritance' &&
        parsed3?.type === 'Inheritance' &&
        buildTermKey(parsed1.subject) === buildTermKey(parsed3.subject) &&
        buildTermKey(parsed2.subject) === buildTermKey(parsed3.predicate),
    action: (parsed1, parsed2, parsed3, task1, task2, task3) => {
        const newTermKey = buildTermKey({
            type: 'Inheritance',
            subject: parsed1.predicate,
            predicate: parsed2.predicate
        });
        const newTruthValue = TruthValueManager.analogize(
            task1.state.truthValue,
            task2.state.truthValue,
            task3.state.truthValue
        );
        return {newTermKey, newTruthValue};
    },
});
