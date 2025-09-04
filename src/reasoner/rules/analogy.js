const { buildTermKey } = require('../../utils/term-builder');
const { analogizeTruthValue } = require('../truth-value');
const { createRule } = require('./rule-builder');

module.exports = createRule({
    name: 'analogy',
    arity: 3,
    operands: [
        (task) => task.punctuation === '.',
        (task) => task.punctuation === '.',
        (task) => task.punctuation === '.',
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
        const newTruthValue = analogizeTruthValue(
            task1.state.truthValue,
            task2.state.truthValue,
            task3.state.truthValue
        );
        return { newTermKey, newTruthValue };
    },
});
