/**
 * Formats a task object for broadcasting to clients.
 * @param {object} task - The task object to format.
 * @returns {object} The formatted task.
 */
export const formatTaskForBroadcast = (task) => ({
    id: task.id,
    termKey: task.termKey,
    punctuation: task.punctuation,
    priority: task.state?.priority || 0,
    truthValue: task.state?.truthValue || { frequency: 0.5, confidence: 0.5 },
    occurrenceTime: task.state?.occurrenceTime || null,
    creationTime: task.state?.stamp?.creationTime || Date.now()
});

/**
 * Creates a filter function for tasks based on their punctuation type.
 * @param {string} filter - The filter type ('belief', 'goal', 'question', or 'all').
 * @returns {Function} A filter function.
 */
export const createTaskFilter = (filter) => (task) => {
    switch (filter) {
        case 'belief':
            return task.punctuation === '.';
        case 'goal':
            return task.punctuation === '!';
        case 'question':
            return task.punctuation === '?';
        default:
            return true;
    }
};

/**
 * Creates a filter function for tasks based on their priority level.
 * @param {string} priority - The priority level ('high', 'medium', 'low', or 'all').
 * @returns {Function} A filter function.
 */
export const createPriorityFilter = (priority) => (task) => {
    const taskPriority = task.state?.priority || task.priority || 0;
    switch (priority) {
        case 'high':
            return taskPriority >= 0.7;
        case 'medium':
            return taskPriority >= 0.3 && taskPriority < 0.7;
        case 'low':
            return taskPriority < 0.3;
        default:
            return true;
    }
};

/**
 * Creates a composite filter that combines multiple filter functions.
 * @param {...Function} filters - Filter functions to combine.
 * @returns {Function} A function that returns true if all filters pass.
 */
export const createCompositeFilter = (...filters) => (task) => {
    for (const filter of filters) {
        if (!filter(task)) {
            return false;
        }
    }
    return true;
};