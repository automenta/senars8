import {
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    getTasksByType,
    isBelief,
    isGoal,
    isQuestion,
    isTask
} from './task-utils.js';
import {
    generateActionId,
    generateHashId,
    generateOptimizedId,
    generatePlanId,
    generateSequentialId
} from './IdGenerator.js';


export const task = {
    isBelief,
    isGoal,
    isQuestion,
    isTask,
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
};

export const id = {
    sequential: generateSequentialId,
    hash: generateHashId,
    optimized: generateOptimizedId,
    action: generateActionId,
    plan: generatePlanId,
};