const {buildTermKey} = require('../../utils/term-utils');
const TruthValueManager = require('../TruthValueManager');
const {createRule} = require('./rule-builder');
const {isBelief} = require('../../utils/task-utils');
const {createInferenceError} = require('../../utils/error-handler');

module.exports = createRule({
    name: 'modus-ponens',
    arity: 2,
    operands: [
        (task) => isBelief(task),
        (task) => isBelief(task),
    ],
    condition: (parsed1, parsed2) => {
        if (!parsed1 || !parsed2) {
            return false;
        }
        return parsed1.type === 'Implication' &&
               parsed2.type === 'Atomic' &&
               parsed1.subject.key === parsed2.key;
    },
    action: (parsed1, parsed2, task1, task2) => {
        try {
            // Validate inputs
            if (!parsed1 || !parsed2 || !parsed1.predicate) {
                throw createInferenceError('Invalid term structure for modus-ponens rule');
            }
            
            const newTermKey = buildTermKey(parsed1.predicate);
            
            if (!newTermKey) {
                throw createInferenceError('Failed to build term key for modus-ponens rule');
            }
            
            const newTruthValue = TruthValueManager.deduce(task1.state.truthValue, task2.state.truthValue);
            return {newTermKey, newTruthValue};
        } catch (error) {
            if (error.name === 'InferenceError') {
                throw error;
            }
            throw createInferenceError(`Error in modus-ponens rule action: ${error.message}`);
        }
    },
});
