/**
 * Utility functions for task type checking and manipulation
 */

/**
 * Check if a task is a belief (judgment)
 * @param {Task} task - The task to check
 * @returns {boolean} True if the task is a belief
 */
function isBelief(task) {
    return task?.punctuation === '.';
}

/**
 * Check if a task is a goal
 * @param {Task} task - The task to check
 * @returns {boolean} True if the task is a goal
 */
function isGoal(task) {
    return task?.punctuation === '!';
}

/**
 * Check if a task is a question
 * @param {Task} task - The task to check
 * @returns {boolean} True if the task is a question
 */
function isQuestion(task) {
    return task?.punctuation === '?';
}

/**
 * Get tasks of a specific type from an array of tasks
 * @param {Task[]} tasks - Array of tasks to filter
 * @param {string} type - The punctuation type to filter by ('.', '!', or '?')
 * @returns {Task[]} Filtered array of tasks
 */
function getTasksByType(tasks, type) {
    return tasks.filter(task => task?.punctuation === type);
}

/**
 * Get belief tasks from an array of tasks
 * @param {Task[]} tasks - Array of tasks to filter
 * @returns {Task[]} Array of belief tasks
 */
function getBeliefTasks(tasks) {
    return getTasksByType(tasks, '.');
}

/**
 * Get goal tasks from an array of tasks
 * @param {Task[]} tasks - Array of tasks to filter
 * @returns {Task[]} Array of goal tasks
 */
function getGoalTasks(tasks) {
    return getTasksByType(tasks, '!');
}

/**
 * Get question tasks from an array of tasks
 * @param {Task[]} tasks - Array of tasks to filter
 * @returns {Task[]} Array of question tasks
 */
function getQuestionTasks(tasks) {
    return getTasksByType(tasks, '?');
}

module.exports = {
    isBelief,
    isGoal,
    isQuestion,
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks
};