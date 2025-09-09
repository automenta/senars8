const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-factories');
const config = require('../../config');
const Task = require('../../core/Task');
const Term = require('../../core/Term');

module.exports = createRule({
    name: 'conversion',
    arity: 1,
    operands: [
        (task) => Task.isBelief(task),
    ],
    condition: (parsed1) =>
        parsed1?.type === 'Inheritance',
    action: (parsed1, task1) => {
        // Conversion: (S --> P) |- (P --> S) with adjusted truth value
        const newTermKey = Term.buildTermKey({
            type: 'Inheritance',
            subject: parsed1.predicate,
            predicate: parsed1.subject
        });

        // Adjust truth value for conversion (weaker confidence)
        const newTruthValue = {
            frequency: task1.state.truthValue.frequency,
            confidence: task1.state.truthValue.confidence * config.temporal.TEMPORAL_RELATIONSHIP_CONFIDENCE
        };

        return {newTermKey, newTruthValue};
    },
});