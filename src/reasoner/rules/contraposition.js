const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');
const {isBelief} = require('../../utils/task-utils');

module.exports = createRule({
    name: 'contraposition',
    arity: 1,
    operands: [
        (task) => isBelief(task),
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