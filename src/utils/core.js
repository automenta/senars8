import * as validation from './validation.js';
import {
    filterByProperty,
    isEmptyArray,
    isNonEmptyArray,
    isPlainObject,
    normalizeToArray,
    safeGet,
    sumBy
} from './collections/index.js';
import {cosineSimilarity, embeddingsEqual} from './math.js';
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
import {createUnifiedErrorHandler} from './errorHandler.js';
import {debug, error, info, warn} from './logger.js';
import EventBus from '../system/EventBus.js';

export {
    validation,
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray,
    isPlainObject,
    sumBy,
    safeGet,
    cosineSimilarity,
    embeddingsEqual,
    generateSequentialId,
    generateHashId,
    generateOptimizedId,
    generateActionId,
    generatePlanId,
    isBelief,
    isGoal,
    isQuestion,
    getTasksByType,
    getBeliefTasks,
    getGoalTasks,
    getQuestionTasks,
    isTask,
    parseTerm,
    validateTermKey,
    createUnifiedErrorHandler,
    error,
    warn,
    info,
    debug,
    EventBus
};