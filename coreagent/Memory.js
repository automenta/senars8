import Component from './Component.js';
import MemoryCore from '../core/memory/Memory.js';
import Task from '../core/core/Task.js';
import Term from '../core/core/Term.js';
import {normalizeToArray} from '../core/utils/collections/index.js';
import {isTask} from '../core/utils/task-utils.js';
import TimeBasedForgettingStrategy from '../core/memory/strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../core/utils/logger.js';
import MemoryIndexer from '../core/memory/MemoryIndexer.js';
import {createError} from '../core/utils/errorHandler.js';
import {wrapAsync} from '../core/utils/asyncWrapper.js';
import {SystemEvents} from '../core/system/SystemEvents.js';
import {SystemCommands} from '../core/system/SystemCommands.js';
import Bag from '../core/utils/bag.js';

const FORGETTING_STRATEGIES = {
    TimeBased: TimeBasedForgettingStrategy,
};

class Memory extends Component {
    constructor(core) {
        super('memory', core);

        // Initialize core memory system with proper dependencies
        this.memoryCore = new MemoryCore(
            this.core.config,
            this.core.messages, // Use coreagent's message system as event bus
            this.core.messages  // Use coreagent's message system as command bus
        );

        // Expose core memory methods for compatibility
        this.addTerm = wrapAsync(this.memoryCore.addTerm.bind(this.memoryCore), 'Memory', 'addTerm', {rethrow: true});
        this.addTask = wrapAsync(this.memoryCore.addTask.bind(this.memoryCore), 'Memory', 'addTask');
        this.addTasks = wrapAsync(this.memoryCore.addTasks.bind(this.memoryCore), 'Memory', 'addTasks');
        this.removeTask = wrapAsync(this.memoryCore.removeTask.bind(this.memoryCore), 'Memory', 'removeTask');
        this.getAllTasks = wrapAsync(this.memoryCore.getAllTasks.bind(this.memoryCore), 'Memory', 'getAllTasks', {defaultValue: []});
        this.getHighestPriorityTasks = wrapAsync(this.memoryCore.getHighestPriorityTasks.bind(this.memoryCore), 'Memory', 'getHighestPriorityTasks', {defaultValue: []});
        this.getBeliefs = wrapAsync(this.memoryCore.getBeliefs.bind(this.memoryCore), 'Memory', 'getBeliefs', {defaultValue: []});
        this.getGoals = wrapAsync(this.memoryCore.getGoals.bind(this.memoryCore), 'Memory', 'getGoals', {defaultValue: []});
        this.getQuestions = wrapAsync(this.memoryCore.getQuestions.bind(this.memoryCore), 'Memory', 'getQuestions', {defaultValue: []});
        this.getRecentTasks = wrapAsync(this.memoryCore.getRecentTasks.bind(this.memoryCore), 'Memory', 'getRecentTasks', {defaultValue: []});
        this.queryTasks = wrapAsync(this.memoryCore.queryTasks.bind(this.memoryCore), 'Memory', 'queryTasks', {defaultValue: []});
        this.getTasksByPunctuation = wrapAsync(this.memoryCore.getTasksByPunctuation.bind(this.memoryCore), 'Memory', 'getTasksByPunctuation', {defaultValue: []});
        this.getTerm = this.memoryCore.getTerm.bind(this.memoryCore);
        this.getAllTerms = this.memoryCore.getAllTerms.bind(this.memoryCore);
        this.findRelatedTerms = wrapAsync(this.memoryCore.findRelatedTerms.bind(this.memoryCore), 'Memory', 'findRelatedTerms', {defaultValue: []});
        this.getTermSemanticContext = wrapAsync(this.memoryCore.getTermSemanticContext.bind(this.memoryCore), 'Memory', 'getTermSemanticContext', {defaultValue: []});
        this.findSimilarTasks = wrapAsync(this.memoryCore.findSimilarTasks.bind(this.memoryCore), 'Memory', 'findSimilarTasks', {defaultValue: []});
        this.findTasksBySemanticQuery = wrapAsync(this.memoryCore.findTasksBySemanticQuery.bind(this.memoryCore), 'Memory', 'findTasksBySemanticQuery', {defaultValue: []});
        this.getTasksByBagSampling = this.memoryCore.getTasksByBagSampling.bind(this.memoryCore);
        this.getRecentTasksByBagSampling = this.memoryCore.getRecentTasksByBagSampling.bind(this.memoryCore);
        this.addTaskToSemanticBag = this.memoryCore.addTaskToSemanticBag.bind(this.memoryCore);
        this.getSemanticTasksByBagSampling = this.memoryCore.getSemanticTasksByBagSampling.bind(this.memoryCore);
    }

    setupHandlers() {
        // Core memory command handlers
        this.core.messages.handle('memory:get-all', () => this.getAllTasks());
        this.core.messages.handle('memory:get-by-id', (id) => this.memoryCore.getTask(id));
        this.core.messages.handle('memory:add-task', (task) => this._addTaskCompat(task));
        this.core.messages.handle('memory:query', (query) => this._queryCompat(query));
        this.core.messages.handle('memory:get-focus-set', () => this._getFocusSetCompat());
        this.core.messages.handle('memory:getStats', () => this._getStatsCompat());

        // Legacy compatibility handlers
        this.core.messages.handle(SystemCommands.MEMORY_GET_TASK, async (id) => this.memoryCore.getTask(id));
        this.core.messages.handle(SystemCommands.MEMORY_GET_TERM, async (key) => this.memoryCore.getTerm(key));
        this.core.messages.handle(SystemCommands.MEMORY_GET_ALL_TASKS, async () => this.getAllTasks());
        this.core.messages.handle(SystemCommands.MEMORY_GET_ALL_TERMS, async () => this.getAllTerms());
        this.core.messages.handle(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, async (k) => this.getHighestPriorityTasks(k));
        this.core.messages.handle(SystemCommands.MEMORY_GET_STATS, async () => this._getStatsCompat());
    }

    // Compatibility wrapper methods
    async _addTaskCompat(task) {
        if (!task) return null;

        // Convert plain object to Task if needed
        if (!(task instanceof Task) && typeof task === 'object') {
            task = this._convertToTask(task);
        }

        return await this.memoryCore.addTask(task);
    }

    _convertToTask(taskData) {
        if (!taskData.termKey || !taskData.punctuation) {
            throw new Error('Task data must have termKey and punctuation');
        }

        const term = this.memoryCore.getTerm(taskData.termKey);
        if (!term && taskData.term) {
            // Create term if it doesn't exist and term data is provided
            const newTerm = new Term(taskData.term);
            this.memoryCore.addTerm(newTerm);
        }

        return Task.fromMacro({
            sentence: `${taskData.termKey}${taskData.punctuation}`,
            truth: taskData.truthValue ? [taskData.truthValue.frequency, taskData.truthValue.confidence] : undefined,
            stamp: taskData.stamp
        });
    }

    async _queryCompat(query) {
        if (!query) {
            return await this.getAllTasks();
        }

        // Convert coreagent query format to core memory query format
        const coreQuery = {};

        if (query.type) coreQuery.type = query.type;
        if (query.priorityThreshold !== undefined) coreQuery.priorityThreshold = query.priorityThreshold;
        if (query.punctuation) coreQuery.punctuation = query.punctuation;
        if (query.limit) coreQuery.limit = query.limit;

        return await this.memoryCore.queryTasks(coreQuery);
    }

    _getFocusSetCompat() {
        const focusSetSize = this.core.config.getNumber('FOCUS_SET_SIZE', 20);
        return this.getHighestPriorityTasks(focusSetSize);
    }

    _getStatsCompat() {
        const stats = this.memoryCore.getStatistics();
        // Convert to coreagent expected format for backward compatibility
        return {
            tasks: stats.totalTasks,
            utilization: stats.totalTasks / (this.core.config.getNumber('MEMORY_CAPACITY', 1000) || 1000),
            // Include additional stats from core memory
            ...stats
        };
    }

    // Enhanced methods for coreagent API
    _getById(id) {
        return this.memoryCore.getTask(id);
    }

    async _addTask(task) {
        return await this._addTaskCompat(task);
    }

    async _query(query) {
        return await this._queryCompat(query);
    }

    _getFocusSet() {
        return this._getFocusSetCompat();
    }

    _getStats() {
        return this._getStatsCompat();
    }

    _invalidateCache() {
        // Core memory handles its own cache invalidation
    }

    async onStart() {
        // Initialize core memory if needed
        if (this.memoryCore && typeof this.memoryCore.initialize === 'function') {
            await this.memoryCore.initialize();
        }
    }

    async onStop() {
        // Clean shutdown of core memory
        if (this.memoryCore && typeof this.memoryCore.clear === 'function') {
            await this.memoryCore.clear();
        }
    }

    // Additional utility methods for coreagent compatibility
    getTask(id) {
        return this.memoryCore.getTask(id);
    }

    getTerm(key) {
        return this.memoryCore.getTerm(key);
    }

    // Expose core memory statistics
    getStatistics() {
        return this.memoryCore.getStatistics();
    }

    // Expose core memory indexer for advanced queries
    getIndexer() {
        return this.memoryCore.indexer;
    }
}

export default Memory;