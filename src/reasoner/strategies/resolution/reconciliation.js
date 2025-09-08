const Task = require('../../../core/Task');
const {createMetaTask} = require('../strategy-utils');
const config = require('../../../config');

function reconciliation(contradiction) {
    const [task1, task2] = contradiction.tasks;
    const c1 = task1.state.truthValue.confidence,
        c2 = task2.state.truthValue.confidence;
    const f1 = task1.state.truthValue.frequency,
        f2 = task2.state.truthValue.frequency;
    const reconciledFrequency = (f1 * c1 + f2 * c2) / (c1 + c2);
    const reconciledConfidence = Math.min(c1, c2) * config.temporal.TEMPORAL_RELATIONSHIP_CONFIDENCE;
    const reconciledTask = new Task(task1.term, '.', {
        frequency: reconciledFrequency,
        confidence: reconciledConfidence
    });
    const metaTasks = [task1, task2].map(t => createMetaTask('investigate_source', t.termKey, contradiction.confidence)).filter(Boolean);
    return [reconciledTask, ...metaTasks];
}

module.exports = reconciliation;
