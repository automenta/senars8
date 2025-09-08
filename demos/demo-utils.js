const Task = require('../src/core/Task');
const {parseTerm} = require('../src/parser/narseseParser');

/**
 * Creates a new Task with the given parameters.
 * @param {string} termKey - The term key for the task.
 * @param {string} punctuation - The punctuation mark for the task.
 * @param {object} truthValue - The truth value for the task.
 * @param {object} stamp - The stamp for the task.
 * @returns {Task|null} The created Task object, or null if parsing fails.
 */
function createTask(termKey, punctuation, truthValue, stamp = {creationTime: Date.now()}) {
    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) {
        console.warn(`Failed to parse term: ${termKey}`);
        return null;
    }
    return new Task(parsedTerm, punctuation, truthValue, stamp);
}

module.exports = {
    createTask,
};
