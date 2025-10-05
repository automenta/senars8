// Core entities - always available
export {Task, Term, BaseEntity} from './core/index.js';

// Configuration - always available
export {default as config} from './config/index.js';
export {PUNCTUATION, OP, REL, TOKEN} from './config/constants.js';

// Essential utilities - always available
export {cosineSimilarity, embeddingsEqual} from './utils/math.js';
export {generateId} from './utils/idGenerator.js';
export {error, warn, info, debug} from './utils/logger.js';
export {parseTerm, validateTermKey} from './parser/parse-utils.js';

// Essential collections utilities - always available
export {
    filterByProperty,
    normalizeToArray,
    isNonEmptyArray,
    isEmptyArray,
    isPlainObject,
    sumBy,
    safeGet
} from './utils/collections/index.js';

// Essential task utilities - always available
export {
    isBelief, isGoal, isQuestion, getTasksByType, getBeliefTasks, getGoalTasks, getQuestionTasks, isTask
} from './utils/task-utils.js';

// Core system components - always available
export {
    System, SystemFactory, Cycle, ActionExecutor, Perception, Planner, MetaCognition, Introspection, EventBus
} from './utils/system.js';

// Minimal API for basic usage - already exported above

// Re-export additional commonly used utilities
export {createUnifiedErrorHandler, agentErrorHandler} from './utils/errorHandler.js';

// Advanced components - available when needed
export {Reasoner, TruthValueManager, TemporalReasoner} from './reasoner/index.js';
export {Memory} from './memory/index.js';
export {LM} from './lm/index.js';
export {lexer, tokenize} from './parser/index.js';
export {ReasoningStrategy} from './reasoner/StrategyInterface.js';
export {SystemContext} from './reasoner/SystemContext.js';
