const Task = require('../../core/Task');
const { parseTerm } = require('../../parser/narseseParser');

function createMetaTask(action, targetTermKey, confidence) {
    const metaTermKey = `(&, ${action}, ${targetTermKey})`;
    const parsedMetaTerm = parseTerm(metaTermKey);
    if (!parsedMetaTerm) return null;
    return new Task(parsedMetaTerm, '!', {
        frequency: 1.0,
        confidence
    });
}

module.exports = { createMetaTask };
