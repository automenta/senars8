import Task from '../../../core/Task.js';
import config from '../../../config.js';

function evidenceGathering(contradiction) {
    return contradiction.tasks.map(task => new Task(task.term, '?', {
        frequency: 1.0,
        confidence: config.DEFAULT_TRUTH_VALUE.confidence
    }));
}

export default evidenceGathering;
