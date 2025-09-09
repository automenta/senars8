const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-factories');
const Task = require('../../core/Task');
const Term = require('../../core/Term');

module.exports = createRule({
    name: 'contraposition',
    arity: 1,
    operands: [
        (task) => Task.isBelief(task),
    ],
    condition: (parsed1) =>
        parsed1?.type === 'Inheritance',
    action: (parsed1, task1) => {
        // Contraposition: (S --> P) |- ((--,P) --> (--,S))
        const newTermKey = Term.buildTermKey({
            type: 'Inheritance',
            subject: `(--,${Term.buildTermKey(parsed1.predicate)})`,
            predicate: `(--,${Term.buildTermKey(parsed1.subject)})`
        });

        // Truth value remains the same for contraposition
        const newTruthValue = {
            frequency: task1.state.truthValue.frequency,
            confidence: task1.state.truthValue.confidence
        };

        return {newTermKey, newTruthValue};
    },
});