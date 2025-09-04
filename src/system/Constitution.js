const Task = require('../core/Task');
const {parseTerm} = require('../parser/TermParser');

const DRIVES = [
    new Task(parseTerm('AcquireKnowledge'), '!'),
    new Task(parseTerm('ReduceUncertainty'), '!'),
    new Task(parseTerm('MaintainCoherence'), '!'),
    new Task(parseTerm('MaintainCognitiveIntegrity'), '!'),
];

const CONSTRAINTS = [
    new Task(parseTerm('((&, self, cause_harm) ==> NEGATIVE_OUTCOME)'), '.', {frequency: 1.0, confidence: 0.99}),
];

const CONSTITUTION_TASKS = Object.freeze([
    ...DRIVES,
    ...CONSTRAINTS,
]);

module.exports = CONSTITUTION_TASKS;
