/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} content
 * @property {'belief'|'goal'|'question'|'task'} type
 * @property {number} priority
 * @property {Object} truthValue
 * @property {number} truthValue.frequency
 * @property {number} truthValue.confidence
 * @property {number} timestamp
 * @property {string} createdAt
 */

/**
 * @typedef {Object} TruthValue
 * @property {number} frequency
 * @property {number} confidence
 */

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} type
 * @property {Array<Function>} conditions
 * @property {Function} action
 * @property {boolean} [haltOnMatch]
 */

/**
 * @typedef {Object} Strategy
 * @property {string} name
 * @property {number} priority
 * @property {Function} canHandle
 * @property {Function} execute
 */

/**
 * @typedef {Object} Component
 * @property {string} name
 * @property {Core} core
 * @property {boolean} initialized
 * @property {Function} initialize
 * @property {Function} start
 * @property {Function} stop
 */

/**
 * @typedef {Object} ConfigData
 * @property {number} [FOCUS_SET_SIZE]
 * @property {number} [ACTIONABLE_GOAL_PRIORITY_THRESHOLD]
 * @property {number} [CYCLE_INTERVAL_MS]
 * @property {number} [MEMORY_CAPACITY]
 * @property {boolean} [DEBUG_LOGGING]
 */