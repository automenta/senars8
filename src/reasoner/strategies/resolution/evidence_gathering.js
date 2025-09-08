const Task = require('../../../core/Task');
const config = require('../../../config');

function evidenceGathering(contradiction) {
    return contradiction.tasks.map(task => new Task(task.term, '?', {
        frequency: 1.0,
        confidence: config.DEFAULT_TRUTH_VALUE.confidence
    }));
}

module.exports = evidenceGathering;
