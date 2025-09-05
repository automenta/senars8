const {buildTermKey} = require('../../utils/term-builder');
const {deduceTruthValue} = require('../truth-value');
const {createRule} = require('./rule-builder');

module.exports = createRule({
    name: 'contraposition',
    arity: 1,
    operands: [
        (task) => task.punctuation === '.',
    ],
    condition: (parsed1) =>
        parsed1?.type === 'Inheritance',
    action: (parsed1, task1) => {
        // Contraposition: (S --> P) |- ((--,P) --> (--,S))
        const newTermKey = buildTermKey({
            type: 'Inheritance',
            subject: `(--,${buildTermKey(parsed1.predicate)})`,
            predicate: `(--,${buildTermKey(parsed1.subject)})`
        });
        
        // Truth value remains the same for contraposition
        const newTruthValue = {
            frequency: task1.state.truthValue.frequency,
            confidence: task1.state.truthValue.confidence
        };
        
        return {newTermKey, newTruthValue};
    },
});