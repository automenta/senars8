const Task = require('../core/Task');
const {parseTerm} = require('../parser/narseseParser');

const DRIVES = [
    new Task(parseTerm('AcquireKnowledge'), '!'),
    new Task(parseTerm('ReduceUncertainty'), '!'),
    new Task(parseTerm('MaintainCoherence'), '!'),
    new Task(parseTerm('MaintainCognitiveIntegrity'), '!'),
];

const CONSTRAINTS = [];

const CONSTITUTION_TASKS = Object.freeze([
    ...DRIVES,
    ...CONSTRAINTS,
]);

module.exports = CONSTITUTION_TASKS;
