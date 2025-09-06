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
    condition: (p1, p2) =>
        (p1?.type === 'Implication' && p2?.type === 'Atomic' && p1.subject.key === p2.key) ||
        (p2?.type === 'Implication' && p1?.type === 'Atomic' && p2.subject.key === p1.key),
    action: (p1, p2, task1, task2) => {
        const implication = p1.type === 'Implication' ? p1 : p2;
        const premiseTask = p1.type === 'Implication' ? task2 : task1;
        const implicationTask = p1.type === 'Implication' ? task1 : task2;

        const newTermKey = buildTermKey(implication.predicate);
        const newTruthValue = TruthValueManager.deduce(implicationTask.state.truthValue, premiseTask.state.truthValue);
        return {newTermKey, newTruthValue};
    },
});
