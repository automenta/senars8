import Task from '../core/Task.js';
import { filterByProperty } from './collection.js';

/**
 * Checks if a task is a belief.
 * @param {Task} task - The task to check.
 * @returns {boolean} True if the task is a belief.
 */
export const isBelief = task => task?.punctuation === '.';

/**
 * Checks if a task is a goal.
 * @param {Task} task - The task to check.
 * @returns {boolean} True if the task is a goal.
 */
export const isGoal = task => task?.punctuation === '!';

/**
 * Checks if a task is a question.
 * @param {Task} task - The task to check.
 * @returns {boolean} True if the task is a question.
 */
export const isQuestion = task => task?.punctuation === '?';

/**
 * Filters a list of tasks by a specific punctuation type.
 * @param {Array<Task>} tasks - The list of tasks.
 * @param {string} type - The punctuation to filter by ('.', '!', '?').
 * @returns {Array<Task>} The filtered list of tasks.
 */
export const getTasksByType = (tasks, type) => filterByProperty(tasks, 'punctuation', type);

/**
 * Gets all belief tasks from a list.
 * @param {Array<Task>} tasks - The list of tasks.
 * @returns {Array<Task>} A list of belief tasks.
 */
export const getBeliefTasks = tasks => getTasksByType(tasks, '.');

/**
 * Gets all goal tasks from a list.
 * @param {Array<Task>} tasks - The list of tasks.
 * @returns {Array<Task>} A list of goal tasks.
 */
export const getGoalTasks = tasks => getTasksByType(tasks, '!');

/**
 * Gets all question tasks from a list.
 * @param {Array<Task>} tasks - The list of tasks.
 *returns {Array<Task>} A list of question tasks.
 */
export const getQuestionTasks = tasks => getTasksByType(tasks, '?');

/**
 * Checks if an object is an instance of a Task.
 * @param {*} obj - The object to check.
 * @returns {boolean} True if the object is a Task instance.
 */
export const isTask = obj => obj instanceof Task;
