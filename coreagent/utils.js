export const createTask = (content, type = 'belief', priority = 0.5, truthValue = null) => ({
    id: generateId(),
    content,
    type,
    priority,
    truthValue: truthValue || {frequency: 0.5, confidence: 0.9},
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
});

export const createBelief = (content, priority = 0.5, truthValue = null) =>
    createTask(content, 'belief', priority, truthValue);

export const createGoal = (content, priority = 0.7, truthValue = null) =>
    createTask(content, 'goal', priority, truthValue);

export const createQuestion = (content, priority = 0.6, truthValue = null) =>
    createTask(content, 'question', priority, truthValue);

// Import the more sophisticated ID generator from core utils
import {generateId as generateCoreId} from '../core/utils/idGenerator.js';

export const generateId = generateCoreId;

// Import deepClone from GeneralUtils for consistency
import {deepClone} from '../core/utils/GeneralUtils.js';

export {deepClone};

export const validateTask = task => {
    if (!task || typeof task !== 'object')
        return {valid: false, error: 'Task must be an object'};

    const required = ['id', 'content', 'type'];
    for (const field of required) {
        if (!(field in task))
            return {valid: false, error: `Task missing required field: ${field}`};
    }

    if (!['belief', 'goal', 'question', 'task'].includes(task.type))
        return {valid: false, error: `Invalid task type: ${task.type}`};

    if (typeof task.priority !== 'number' || task.priority < 0 || task.priority > 1)
        return {valid: false, error: 'Task priority must be a number between 0 and 1'};

    return {valid: true};
};

export const measureTime = async (asyncFn, ...args) => {
    const start = performance.now();
    const result = await asyncFn(...args);
    return {result, duration: performance.now() - start};
};

export const benchmarkFunction = async (name, fn, iterations = 1000, ...args) => {
    const times = [];
    let total = 0;

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await fn(...args);
        const duration = performance.now() - start;
        times.push(duration);
        total += duration;
    }

    return {
        name, iterations, avgDuration: total / iterations,
        minDuration: Math.min(...times), maxDuration: Math.max(...times), totalDuration: total
    };
};

// Import debounce and throttle from GeneralUtils for consistency
import {debounce, throttle} from '../core/utils/GeneralUtils.js';

export {debounce, throttle};

export const createTaskFilter = criteria => task =>
    Object.entries(criteria).every(([k, v]) => task[k] === v);

export const calculateTaskSimilarity = (task1, task2) => {
    if (!task1?.content || !task2?.content) return 0;
    const [t1, t2] = [task1.content.toLowerCase(), task2.content.toLowerCase()];
    const [w1, w2] = [new Set(t1.split(/\s+/)), new Set(t2.split(/\s+/))];
    const intersection = new Set([...w1].filter(x => w2.has(x)));
    const union = new Set([...w1, ...w2]);
    return intersection.size / union.size;
};

export const sortByPriority = (tasks, desc = true) =>
    [...tasks].sort((a, b) => desc ? (b.priority || 0) - (a.priority || 0) : (a.priority || 0) - (b.priority || 0));

export const limitTasks = (tasks, limit = 10) =>
    limit <= 0 ? [] : tasks.slice(0, limit);