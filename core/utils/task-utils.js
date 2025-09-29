import Task from '../core/Task.js';
import {filterByProperty} from './collections/index.js';
import {createUnifiedErrorHandler} from './errorHandler.js';
import {parseTerm} from '../parser/parse-utils.js';

const isBelief = task => task?.punctuation === '.';
const isGoal = task => task?.punctuation === '!';
const isQuestion = task => task?.punctuation === '?';

const getTasksByType = (tasks, type) => filterByProperty(tasks, 'punctuation', type);
const getBeliefTasks = tasks => getTasksByType(tasks, '.');
const getGoalTasks = tasks => getTasksByType(tasks, '!');
const getQuestionTasks = tasks => getTasksByType(tasks, '?');

const isTask = obj => obj instanceof Task;

const utilErrorHandler = createUnifiedErrorHandler('CoreUtils');

const validateNarseseStatement = (statement) => {
    if (!statement || typeof statement !== 'string') {
        return {valid: false, error: 'Statement must be a non-empty string'};
    }

    const trimmed = statement.trim();
    if (!trimmed) {
        return {valid: false, error: 'Statement cannot be empty after trimming'};
    }

    try {
        const parsed = parseTerm(trimmed);
        return {
            valid: !!parsed,
            parsed: parsed,
            error: parsed ? null : 'Failed to parse statement'
        };
    } catch (error) {
        return {valid: false, error: error.message};
    }
};

const createTaskFromStatement = (statement, punctuation = '.', priority = 0.5) => {
    try {
        const validation = validateNarseseStatement(statement);
        if (!validation.valid) {
            throw new Error(`Invalid statement: ${validation.error}`);
        }

        return new Task(validation.parsed, punctuation, {priority});
    } catch (error) {
        utilErrorHandler(error, 'createTaskFromStatement');
        throw error;
    }
};

export {
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    isBelief,
    isGoal,
    isQuestion,
    isTask,
    validateNarseseStatement,
    createTaskFromStatement,
};