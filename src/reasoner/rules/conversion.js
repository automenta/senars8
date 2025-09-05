const {buildTermKey} = require('../../utils/term-builder');
const {deduceTruthValue} = require('../truth-value');
const {createRule} = require('./rule-builder');

module.exports = createRule({
    name: 'conversion',
    arity: 1,
    operands: [
        (task) => task.punctuation === '.',
    ],
    condition: (parsed1) =>
        parsed1?.type === 'Inheritance',
    action: (parsed1, task1) => {
        // Conversion: (S --> P) |- (P --> S) with adjusted truth value
        const newTermKey = buildTermKey({
            type: 'Inheritance',
            subject: parsed1.predicate,
            predicate: parsed1.subject
        });

        // Adjust truth value for conversion (weaker confidence)
        const newTruthValue = {
            frequency: task1.state.truthValue.frequency,
            confidence: task1.state.truthValue.confidence * 0.7
        };

        return {newTermKey, newTruthValue};
    },
});