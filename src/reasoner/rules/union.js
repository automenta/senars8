const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');

module.exports = createRule({
    name: 'union',
    arity: 2,
    operands: [
        (task) => task.punctuation === '.',
        (task) => task.punctuation === '.',
    ],
    condition: (parsed1, parsed2) =>
        parsed1?.type === 'Inheritance' &&
        parsed2?.type === 'Inheritance' &&
        buildTermKey(parsed1.predicate) === buildTermKey(parsed2.predicate) &&
        buildTermKey(parsed1.subject) !== buildTermKey(parsed2.subject),
    action: (parsed1, parsed2, task1, task2) => {
        const newTermKey = buildTermKey({
            type: 'Inheritance',
            subject: `(||, ${buildTermKey(parsed1.subject)}, ${buildTermKey(parsed2.subject)})`,
            predicate: parsed1.predicate
        });
        const newTruthValue = TruthValueManager.abduce(task1.state.truthValue, task2.state.truthValue);
        return {newTermKey, newTruthValue};
    },
});