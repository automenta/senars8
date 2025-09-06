const Task = require('../../../core/Task');

function evidenceGathering(contradiction) {
    return contradiction.tasks.map(task => new Task(task.term, '?', {
        frequency: 1.0,
        confidence: 0.9
    }));
}

module.exports = evidenceGathering;
