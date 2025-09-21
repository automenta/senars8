import {cosineSimilarity, embeddingsEqual} from './math.js';
import {filterByProperty, normalizeToArray, isNonEmptyArray, isEmptyArray, isPlainObject, isNonEmptyObject, sumBy, safeGet} from './collections/index.js';
import {generateSequentialId, generateHashId, generateOptimizedId, generateActionId, generatePlanId} from './idGenerator.js';
import {isBelief, isGoal, isQuestion, getTasksByType, getBeliefTasks, getGoalTasks, getQuestionTasks, isTask} from './task-utils.js';
import {parseTerm, validateTermKey} from '../parser/parse-utils.js';
import {createUnifiedErrorHandler} from './core.js';
import {error, warn, info, debug} from './logger.js';
import Validator from './Validator.js';
import EventBus from '../system/EventBus.js';

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
    
    // Event system
    EventBus
};