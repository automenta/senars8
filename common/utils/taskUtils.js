/**
 * Shared task utility functions for the entire Senars project
 */

// Basic task type checking functions
const isBelief = task => task?.punctuation === '.';
const isGoal = task => task?.punctuation === '!';
const isQuestion = task => task?.punctuation === '?';

// Helper function to filter tasks by property (similar to filterByProperty from collections)
const filterByProperty = (array, property, value) => {
    return array.filter(item => item?.[property] === value);
};

// Task filtering functions
const getTasksByType = (tasks, type) => filterByProperty(tasks, 'punctuation', type);
const getBeliefTasks = tasks => getTasksByType(tasks, '.');
const getGoalTasks = tasks => getTasksByType(tasks, '!');
const getQuestionTasks = tasks => getTasksByType(tasks, '?');

// Check if an object is a Task instance (simplified check)
const isTask = obj => obj && typeof obj === 'object' && 'punctuation' in obj && 'termKey' in obj;

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