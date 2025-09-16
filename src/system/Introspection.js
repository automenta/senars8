import EventBus from './EventBus.js';
import {safeSync} from '../utils/error-handler.js';

/**
 * Provides a comprehensive API for observing and querying the internal state
 * of the SeNARS system. This is intended for debugging, visualization,
 * and building user interfaces.
 */
class Introspection {
    /**
     * @param {System} system - The main System instance.
     */
    constructor(system) {
        this.system = system;
        this.memory = system.memory;
        this.reasoner = system.reasoner;
        this.config = system.config;
    }

    // --- System Status ---

    /**
     * Gets a snapshot of the current system status.
     * @returns {object} An object containing status information.
     */
    getStatus() {
        return safeSync(() => ({
            isRunning: this.system.isRunning,
            cycleCount: this.system.cycleCount,
            memory: this.memory.getStatistics(),
            rules: this.reasoner.getRuleNames().length,
            actionHistory: this.system.actionExecutor.getActionHistory().length,
        }), 'getStatus', {});
    }

    /**
     * Gets the full configuration object used by the system.
     * @returns {object} A copy of the system's configuration.
     */
    getConfig() {
        return safeSync(() => ({...this.config}), 'getConfig', {});
    }

    // --- Memory Introspection ---

    /**
     * Retrieves a single task by its ID.
     * @param {string} id - The ID of the task.
     * @returns {Task|null} The task object or null if not found.
     */
    getTask(id) {
        return this.memory.getTask(id);
    }

    /**
     * Retrieves a single term by its key.
     * @param {string} key - The key of the term.
     * @returns {Term|null} The term object or null if not found.
     */
    getTerm(key) {
        return this.memory.getTerm(key);
    }

    /**
     * Queries tasks in memory based on a set of filters.
     * @param {object} [filters={}] - The query filters.
     * See Memory.queryTasks for filter options.
     * @returns {Task[]} An array of tasks that match the filters.
     */
    queryTasks(filters = {}) {
        return this.memory.queryTasks(filters);
    }

    /**
     * Gets statistics about the contents of memory.
     * @returns {object} An object with memory statistics.
     */
    getMemoryStatistics() {
        return this.memory.getStatistics();
    }

    /**
     * Gets all terms currently in memory.
     * @returns {Term[]} An array of all term objects.
     */
    getAllTerms() {
        return this.memory.getAllTerms();
    }

    // --- Reasoner Introspection ---

    /**
     * Gets the names of all available inference rules.
     * @returns {string[]} An array of rule names.
     */
    getAvailableRules() {
        return this.reasoner.getRuleNames();
    }


    /**
     * Gets detailed information about a specific inference rule.
     * @param {string} ruleName - The name of the rule.
     * @returns {object|null} An object with rule info or null if not found.
     */
    getRuleInfo(ruleName) {
        const rule = this.reasoner.getRule(ruleName);
        return rule ? {
            name: rule.name,
            arity: rule.arity,
            description: rule.description || 'No description available',
        } : null;
    }

    // --- EventBus Subscription ---

    /**
     * Subscribes to a system event.
     * @param {string} eventName - The name of the event to listen for.
     * @param {Function} callback - The function to execute when the event is emitted.
     */
    on(eventName, callback) {
        EventBus.on(eventName, callback);
    }

    /**
     * Unsubscribes from a system event.
     * @param {string} eventName - The name of the event.
     * @param {Function} callback - The callback function to remove.
     */
    off(eventName, callback) {
        EventBus.off(eventName, callback);
    }
}

export default Introspection;
