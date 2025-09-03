const Task = require('../core/Task');

const DRIVES = [
    new Task('AcquireKnowledge', '!'),
    new Task('ReduceUncertainty', '!'),
    new Task('MaintainCoherence', '!'),
    new Task('MaintainCognitiveIntegrity', '!'),
];

const CONSTRAINTS = [
    new Task('((&, self, cause_harm) ==> NEGATIVE_OUTCOME)', '.', {frequency: 1.0, confidence: 0.99}),
];

const CONSTITUTION_TASKS = Object.freeze([
    ...DRIVES,
    ...CONSTRAINTS,
]);

module.exports = CONSTITUTION_TASKS;
