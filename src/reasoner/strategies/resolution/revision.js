const { createMetaTask } = require('../strategy-utils');

function revision(contradiction) {
    const [task1, task2] = contradiction.tasks;
    const c1 = task1.state.truthValue.confidence;
    const c2 = task2.state.truthValue.confidence;

    if (c1 === c2) {
        [task1, task2].forEach(t => t.state.truthValue.confidence *= 0.1);
        return [task1, task2].map(t => createMetaTask('investigate_source', t.termKey, contradiction.confidence)).filter(Boolean);
    }

    const taskToRevise = c1 < c2 ? task1 : task2;
    taskToRevise.state.truthValue.confidence *= 0.1;
    return [createMetaTask('investigate_source', taskToRevise.termKey, contradiction.confidence)].filter(Boolean);
}

module.exports = revision;
