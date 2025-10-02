import Task from './core/Task.js';
import Term from './core/Term.js';
import {parseTerm} from './parser/parse-utils.js';
import {agentErrorHandler} from './utils/errorHandler.js';
import {debug, warn} from './utils/logger.js';
import System from './system/System.js';
import {createSystem} from './system/SystemFactory.js';

// Core classes and utilities
export {
    System,
    Task,
    Term,
    parseTerm,
    createSystem,
    agentErrorHandler,
    debug,
    warn
};

// Re-export some commonly used utilities
export {default as BaseEntity} from './core/BaseEntity.js';
export {error, info} from './utils/logger.js';
export {isBelief, isGoal, isQuestion, getTasksByType} from './utils/task-utils.js';
export {cosineSimilarity, embeddingsEqual} from './utils/math.js';

// Export reasoning strategy components
export {ReasoningStrategy} from './reasoner/StrategyInterface.js';
export {SystemContext} from './reasoner/SystemContext.js';
