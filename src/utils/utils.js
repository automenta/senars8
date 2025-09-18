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

// Task utilities
const task = {
    isBelief,
    isGoal,
    isQuestion,
    isTask,
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    // Generic versions
    isType: (task, type) => task?.punctuation === type,
    getByPunctuation: (tasks, punctuation) => getTasksByType(tasks, punctuation)
};

// ID generation utilities
const id = {
    sequential: generateSequentialId,
    hash: generateHashId,
    optimized: generateOptimizedId,
    action: generateActionId,
    plan: generatePlanId,
    // Generic version
    generate: (type, ...args) => {
        switch (type) {
            case 'action':
                return generateActionId(...args);
            case 'plan':
                return generatePlanId(...args);
            default:
                return generateOptimizedId(...args);
        }
    }
};

// Consolidated task type checking functions
const isTaskType = (task, type) => task?.punctuation === type;

const getTasksByPunctuation = (tasks, punctuation) => {
    if (!Array.isArray(tasks)) {
        return [];
    }
    return tasks.filter(item => item && item.punctuation === punctuation);
};

export {
    task,
    id,
    isTaskType,
    getTasksByPunctuation
};