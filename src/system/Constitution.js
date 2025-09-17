import Task from '../core/Task.js';
import {parseTerm} from '../parser/parse-utils.js';

const DRIVES = [
    new Task(parseTerm('AcquireKnowledge'), '!'),
    new Task(parseTerm('ReduceUncertainty'), '!'),
    new Task(parseTerm('MaintainCoherence'), '!'),
    new Task(parseTerm('MaintainCognitiveIntegrity'), '!')
];

const CONSTRAINTS = [];

const CONSTITUTION_TASKS = Object.freeze([
    ...DRIVES,
    ...CONSTRAINTS
]);

export default CONSTITUTION_TASKS;
