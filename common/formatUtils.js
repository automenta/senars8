/**
 * A collection of shared data formatting and normalization utilities.
 */

export const formatNumber = (value, precision = 2) => (value || 0).toFixed(precision);
export const formatTruthValue = (truthValue) => truthValue ?
  `TV(${formatNumber(truthValue.frequency)}, ${formatNumber(truthValue.confidence)})` : '';
export const formatConfidence = (confidence) => `${formatNumber(confidence * 100)}%`;

/**
 * Extracts punctuation from a statement or task.
 * @param {object} task - Task object with statement or punctuation
 * @returns {string} Punctuation mark (. ! or ?)
 */
export const extractPunctuation = (task) => {
    if (task.punctuation) return task.punctuation;
    if (task.statement?.endsWith('!')) return '!';
    if (task.statement?.endsWith('?')) return '?';
    return '.';
};

/**
 * Extracts and normalizes display-relevant data from a task object.
 * @param {object} task - The task object from the agent's state.
 * @returns {object} A normalized object containing display data.
 */
export function getTaskDisplayData(task) {
    if (!task) {
        return {
            termKey: 'Invalid Task',
            priority: formatNumber(0),
            punctuation: '.',
            truthValue: '',
        };
    }

    return {
        termKey: task.termKey || task.statement || task.id || 'Unknown',
        priority: formatNumber(task.priority || task.state?.priority || 0),
        punctuation: extractPunctuation(task),
        truthValue: formatTruthValue(task.state?.truthValue),
    };
}

/**
 * Formats a task for logging or display with key information.
 * @param {object} task - Task object
 * @returns {string} Formatted task string
 */
export const formatTaskForDisplay = (task) => {
    const data = getTaskDisplayData(task);
    return `${data.termKey}${data.punctuation} [${data.priority}] ${data.truthValue}`.trim();
};