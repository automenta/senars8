/**
 * A collection of shared data formatting and normalization utilities.
 */

/**
 * Extracts and normalizes display-relevant data from a task object.
 * This function provides a consistent data structure for use in different UIs.
 *
 * @param {object} task - The task object from the agent's state.
 * @returns {object} A normalized object containing display data.
 */
export function getTaskDisplayData(task) {
    if (!task) {
        return {
            termKey: 'Invalid Task',
            priority: '0.00',
            punctuation: '.',
            truthValue: '',
        };
    }

    const termKey = task.termKey || task.statement || task.id || 'Unknown';
    const priority = (task.priority || task.state?.priority || 0).toFixed(2);
    const punctuation = task.punctuation || (task.statement?.endsWith('!') ? '!' : task.statement?.endsWith('?') ? '?' : '.');

    const tv = task.state?.truthValue;
    const truthValue = tv ? `TV(${tv.frequency.toFixed(2)}, ${tv.confidence.toFixed(2)})` : '';

    return {
        termKey,
        priority,
        punctuation,
        truthValue,
    };
}