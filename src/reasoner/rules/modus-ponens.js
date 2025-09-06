const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');

module.exports = createRule({
    name: 'modus-ponens',
    arity: 2,
    operands: [
        (task) => task.punctuation === '.',
        (task) => task.punctuation === '.',
    ],
    condition: (parsed1, parsed2) =>
        parsed1?.type === 'Implication' &&
        parsed2?.type === 'Atomic' &&
        parsed1.subject.key === parsed2.key,
    action: (parsed1, parsed2, task1, task2) => {
        const newTermKey = buildTermKey(parsed1.predicate);
        const newTruthValue = TruthValueManager.deduce(task1.state.truthValue, task2.state.truthValue);
        return {newTermKey, newTruthValue};
    },
});
