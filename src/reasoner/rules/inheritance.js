const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');
const {isBelief} = require('../../utils/task-utils');
const {createInferenceError} = require('../../utils/error-handler');

module.exports = createRule({
    name: 'inheritance',
    arity: 2,
    operands: [
        (task) => isBelief(task),
        (task) => isBelief(task),
    ],
    condition: (parsed1, parsed2) => {
        if (!parsed1 || !parsed2) {
            return false;
        }
        return parsed1.type === 'Inheritance' &&
               parsed2.type === 'Inheritance' &&
               parsed1.predicate.key === parsed2.subject.key;
    },
    action: (parsed1, parsed2, task1, task2) => {
        try {
            // Validate inputs
            if (!parsed1 || !parsed2 || !parsed1.subject || !parsed2.predicate) {
                throw createInferenceError('Invalid term structure for inheritance rule');
            }
            
            const newTermKey = buildTermKey({
                type: 'Inheritance',
                subject: parsed1.subject,
                predicate: parsed2.predicate
            });
            
            if (!newTermKey) {
                throw createInferenceError('Failed to build term key for inheritance rule');
            }
            
            const newTruthValue = TruthValueManager.deduce(task1.state.truthValue, task2.state.truthValue);
            return {newTermKey, newTruthValue};
        } catch (error) {
            if (error.name === 'InferenceError') {
                throw error;
            }
            throw createInferenceError(`Error in inheritance rule action: ${error.message}`);
        }
    },
});
