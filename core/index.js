import Task from './core/Task.js';
import Term from './core/Term.js';
import {parseTerm} from './parser/parse-utils.js';
import {agentErrorHandler} from './utils/errorHandling.js';
import {debug, warn} from './utils/logger.js';


// Import System after createSystem to avoid circular dependency
import System from './system/System.js';

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
export {BaseEntity} from './core/BaseEntity.js';
export {error, info} from './utils/logger.js';
export {isBelief, isGoal, isQuestion, getTasksByType} from './utils/task-utils.js';
export {cosineSimilarity, embeddingsEqual} from './utils/math.js';

// Create createSystem function inline to avoid circular dependency
async function createSystem(userConfig = {}, components = {}) {
    const SystemFactory = await import('./system/SystemFactory.js');
    return SystemFactory.default.createSystem(userConfig, components);
}
