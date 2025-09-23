import {cosineSimilarity, embeddingsEqual} from './math.js';
import {
    filterByProperty,
    isEmptyArray,
    isNonEmptyArray,
    isNonEmptyObject,
    isPlainObject,
    normalizeToArray,
    safeGet,
    sumBy
} from './collections/index.js';
import {
    generateActionId,
    generateHashId,
    generateOptimizedId,
    generatePlanId,
    generateSequentialId
} from './idGenerator.js';
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
import {parseTerm, validateTermKey} from '../parser/parse-utils.js';
import {createUnifiedErrorHandler} from './core.js';
import {debug, error, info, warn} from './logger.js';
import Validator from './Validator.js';
import EventBus from '../system/EventBus.js';
import * as validation from './validation.js';

// Re-export commonly used utilities
export {
    // Math utilities
    cosineSimilarity,
    embeddingsEqual,

    // Collection utilities
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray,
    isPlainObject,
    isNonEmptyObject,
    sumBy,
    safeGet,

    // ID generation utilities
    generateSequentialId,
    generateHashId,
    generateOptimizedId,
    generateActionId,
    generatePlanId,

    // Task utilities
    isBelief,
    isGoal,
    isQuestion,
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    isTask,

    // Parser utilities
    parseTerm,
    validateTermKey,

    // Error handling
    createUnifiedErrorHandler,

    // Logging
    error,
    warn,
    info,
    debug,

    // Validation
    Validator,
    validation,

    // Event system
    EventBus
};