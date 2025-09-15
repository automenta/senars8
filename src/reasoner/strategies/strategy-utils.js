import Task from '../../core/Task.js';
import { parseTerm } from '../../parser/narseseParser.js';

function createMetaTask(action, targetTermKey, confidence) {
    const metaTermKey = `(&, ${action}, ${targetTermKey})`;
    const parsedMetaTerm = parseTerm(metaTermKey);
    if (!parsedMetaTerm) { return null; }
    return new Task(parsedMetaTerm, '!', {
        frequency: 1.0,
        confidence
    });
}

export { createMetaTask };
