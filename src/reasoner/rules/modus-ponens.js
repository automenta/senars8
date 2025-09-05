const {buildTermKey} = require('../../utils/term-builder');
const {deduceTruthValue} = require('../truth-value');
const {createRule} = require('./rule-builder');

module.exports = createRule({
    name: 'modus-ponens',
    arity: 2,
    operands: [
        (task) => task.punctuation === '.',
        (task) => task.punctuation === '.',
    ],
    condition: (p1, p2) => {
        const implication = p1?.type === 'Implication' ? p1 : (p2?.type === 'Implication' ? p2 : null);
        const atomic = p1?.type === 'Atomic' ? p1 : (p2?.type === 'Atomic' ? p2 : null);
        if (!implication || !atomic) return false;
        return implication.subject.key === atomic.key;
    },
    action: (p1, p2, t1, t2) => {
        const implication = p1?.type === 'Implication' ? p1 : p2;
        const implicationTask = p1?.type === 'Implication' ? t1 : t2;
        const atomicTask = p1?.type === 'Atomic' ? t1 : t2;

        const newTermKey = buildTermKey(implication.predicate);
        const newTruthValue = deduceTruthValue(implicationTask.state.truthValue, atomicTask.state.truthValue);
        return {newTermKey, newTruthValue};
    },
});
