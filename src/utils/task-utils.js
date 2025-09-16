import Task from '../core/Task.js';

/**
 * Utility functions for working with Task objects
 */

/**
 * Checks if a task is a belief (punctuation '.')
 * @param {Task} task - The task to check
 * @returns {boolean} True if the task is a belief
 */
function isBelief(task) {
    return task?.punctuation === '.';
}

/**
 * Checks if a task is a goal (punctuation '!')
 * @param {Task} task - The task to check
 * @returns {boolean} True if the task is a goal
 */
function isGoal(task) {
    return task?.punctuation === '!';
}

/**
 * Checks if a task is a question (punctuation '?')
 * @param {Task} task - The task to check
 * @returns {boolean} True if the task is a question
 */
function isQuestion(task) {
    return task?.punctuation === '?';
}

/**
 * Filters tasks by punctuation type
 * @param {Task[]} tasks - Array of tasks to filter
 * @param {string} type - The punctuation type to filter by
 * @returns {Task[]} Array of filtered tasks
 */
function getTasksByType(tasks, type) {
    // Optimized filtering using for loop for better performance
    const result = [];
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i]?.punctuation === type) {
            result.push(tasks[i]);
        }
    }
    return result;
}

/**
 * Gets all belief tasks from an array of tasks
 * @param {Task[]} tasks - Array of tasks
 * @returns {Task[]} Array of belief tasks
 */
function getBeliefTasks(tasks) {
    return getTasksByType(tasks, '.');
}

/**
 * Checks if an object is a valid Task instance
 * @param {any} obj - The object to check
 * @returns {boolean} True if the object is a valid Task instance
 */
function isTask(obj) {
    return obj instanceof Task;
}

export {
    getTasksByType,
    getBeliefTasks,
    isBelief,
    isGoal,
    isQuestion,
    isTask
};
