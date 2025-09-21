import Task from '../core/Task.js';
import {filterByProperty} from './collections/index.js';

const isBelief = task => task?.punctuation === '.';
const isGoal = task => task?.punctuation === '!';
const isQuestion = task => task?.punctuation === '?';

const getTasksByType = (tasks, type) => filterByProperty(tasks, 'punctuation', type);
const getBeliefTasks = tasks => getTasksByType(tasks, '.');
const getGoalTasks = tasks => getTasksByType(tasks, '!');
const getQuestionTasks = tasks => getTasksByType(tasks, '?');

const isTask = obj => obj instanceof Task;

export {
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    isBelief,
    isGoal,
    isQuestion,
    isTask
};
