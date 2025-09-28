// Import from common utilities to avoid duplication
import {taskUtils} from '@common/index.js';
import Task from '../core/Task.js';

// For backward compatibility, re-export functions but with core-specific Task check
const {
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    isBelief,
    isGoal,
    isQuestion
} = taskUtils;

// Keep the core-specific isTask function since it checks for Task instance
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
