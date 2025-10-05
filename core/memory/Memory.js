import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import Term from '../core/Term.js';
import Task from '../core/Task.js';
import {normalizeToArray} from '../utils/collections/index.js';
import {isTask} from '../utils/task-utils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../utils/logger.js';
import MemoryIndexer from './MemoryIndexer.js';
import {createError} from '../utils/errorHandler.js';
import {wrapAsync} from '../utils/asyncWrapper.js';
import {SystemEvents} from '../system/SystemEvents.js';
import {SystemCommands} from '../system/SystemCommands.js';

const FORGETTING_STRATEGIES = {
    TimeBased: TimeBasedForgettingStrategy,
};

class Memory {
    constructor(configManager, eventBus, commandBus) {
        this.config = configManager;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.indexer = new MemoryIndexer();
        this.cycleCounter = 0;
        this._cachedAllTasks = null;
        this._loadForgettingStrategy();
        this._registerEventListeners();
        this._registerCommandHandlers();

        // Track recently logged invalid task warnings to reduce noise
        this._recentInvalidTaskWarnings = new Map();
        this._invalidTaskWarningTimeout = 30000; // 30 seconds

        this.addTerm = wrapAsync(this._addTerm.bind(this), 'Memory', 'addTerm', {rethrow: true});
        this.addTasks = wrapAsync(this._addTasks.bind(this), 'Memory', 'addTasks');
        this.removeTask = wrapAsync(this._removeTask.bind(this), 'Memory', 'removeTask');
        this.getAllTasks = wrapAsync(this._getAllTasks.bind(this), 'Memory', 'getAllTasks', {defaultValue: []});
        this.getHighestPriorityTasks = wrapAsync(this._getHighestPriorityTasks.bind(this), 'Memory', 'getHighestPriorityTasks', {defaultValue: []});
        this.clone = wrapAsync(this._clone.bind(this), 'Memory', 'clone', {defaultValue: null});
        this.removeTerm = wrapAsync(this._removeTerm.bind(this), 'Memory', 'removeTerm');
        this.clear = wrapAsync(this._clear.bind(this), 'Memory', 'clear');
        this.getStatistics = wrapAsync(this._getStatistics.bind(this), 'Memory', 'getStatistics', {defaultValue: {}});
        this.getBeliefs = wrapAsync(this._getTasksByPunctuation.bind(this, '.'), 'Memory', 'getBeliefs', {defaultValue: []});
        this.getGoals = wrapAsync(this._getTasksByPunctuation.bind(this, '!'), 'Memory', 'getGoals', {defaultValue: []});
        this.getQuestions = wrapAsync(this._getTasksByPunctuation.bind(this, '?'), 'Memory', 'getQuestions', {defaultValue: []});
        this.getRecentTasks = wrapAsync(this._getRecentTasks.bind(this), 'Memory', 'getRecentTasks', {defaultValue: []});
        this.queryTasks = wrapAsync(this._queryTasks.bind(this), 'Memory', 'queryTasks', {defaultValue: []});
        this.exportState = wrapAsync(this._exportState.bind(this), 'Memory', 'exportState', {defaultValue: '{}'});
        this.importState = wrapAsync(this._importState.bind(this), 'Memory', 'importState', {rethrow: true});
    }

    _loadForgettingStrategy() {
        const strategyName = this.config.getString('memory.FORGETTING_STRATEGY_NAME', 'TimeBased');
        const Strategy = FORGETTING_STRATEGIES[strategyName] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new Strategy();
    }

    _registerEventListeners() {
        this.eventBus.on(SystemEvents.TASKS_ADD, async (tasks) => await this.addTasks(tasks));
        this.eventBus.on(SystemEvents.CYCLE_COMPLETE, () => this._performMaintenanceIfNeeded());
        this.eventBus.on(SystemEvents.TERM_ADD, async (terms) => await this._addTermsFromEvent(terms));
        this.eventBus.on(SystemEvents.SYSTEM_RESET, async () => await this.clear());
    }

    async _addTermsFromEvent(terms) {
        const termsToAdd = normalizeToArray(terms);
        for (const term of termsToAdd) {
            await this.addTerm(term);
        }
    }

    _registerCommandHandlers() {
        this.commandBus.handle(SystemCommands.MEMORY_GET_TASK, async (id) => this.getTask(id));
        this.commandBus.handle(SystemCommands.MEMORY_GET_TERM, async (key) => this.getTerm(key));
        this.commandBus.handle(SystemCommands.MEMORY_GET_ALL_TASKS, async () => this.getAllTasks());
        this.commandBus.handle(SystemCommands.MEMORY_GET_ALL_TERMS, async () => this.getAllTerms());
        this.commandBus.handle(SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS, async (k) => this.getHighestPriorityTasks(k));
        this.commandBus.handle(SystemCommands.MEMORY_GET_STATS, async () => this.getStatistics());
    }

    _performMaintenanceIfNeeded() {
        if (this._shouldPerformMaintenance()) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    _shouldPerformMaintenance() {
        this.cycleCounter++;
        const frequency = this.config.getNumber('memory.MAINTENANCE_CYCLE_FREQUENCY', 10);
        return this.cycleCounter % frequency === 0;
    }

    _consolidateMemory() {
        const {priorityThreshold, confidenceThreshold} = this._getConsolidationThresholds();

        const [newShortTermTasks, newLongTermTasks] = this._partitionTasksByThreshold(
            priorityThreshold,
            confidenceThreshold
        );

        this._updateTaskMaps(newShortTermTasks, newLongTermTasks);
        this._invalidateCachedTasks();
    }

    _getConsolidationThresholds() {
        return {
            priorityThreshold: this.config.getNumber('memory.CONSOLIDATION_PRIORITY_THRESHOLD', 0.8),
            confidenceThreshold: this.config.getNumber('memory.CONSOLIDATION_CONFIDENCE_THRESHOLD', 0.9)
        };
    }

    _partitionTasksByThreshold(priorityThreshold, confidenceThreshold) {
        const newShortTermTasks = new Map();
        const newLongTermTasks = new Map(this.longTermTasks);

        for (const [taskId, task] of this.shortTermTasks.entries()) {
            (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold)
                ? newLongTermTasks.set(taskId, task)
                : newShortTermTasks.set(taskId, task);
        }

        return [newShortTermTasks, newLongTermTasks];
    }

    _updateTaskMaps(shortTermTasks, longTermTasks) {
        this.shortTermTasks = shortTermTasks;
        this.longTermTasks = longTermTasks;
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;

        const {shortTermTasks, longTermTasks} = this._applyForgettingStrategy();
        this.shortTermTasks = shortTermTasks;
        this.longTermTasks = longTermTasks;
        this._invalidateCachedTasks();
    }

    _applyForgettingStrategy() {
        const options = this.config.getObject('memory.FORGETTING_STRATEGY_OPTIONS', {});
        return {
            shortTermTasks: this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm),
            longTermTasks: this.forgettingStrategy.prune(this.longTermTasks, options.longTerm)
        };
    }

    // Old function removed - replaced with _invalidateCachedTasks()

    async _addTerm(term) {
        this._validateTerm(term);
        if (this.terms.has(term.key)) {
            debug(`Term '${term.key}' already exists, skipping.`);
            return;
        }

        this._storeTerm(term);
        await this.eventBus.emitAsync(SystemEvents.TERM_ADD, term);
        debug(`Added term '${term.key}'.`);
    }

    _validateTerm(term) {
        if (term === null || term === undefined || !(term instanceof Term)) {
            throw createError.ValidationError('Can only add valid Term instances to memory');
        }
    }

    _storeTerm(term) {
        this.terms.set(term.key, term);
        this.indexer.indexTerm(term);
    }

    getTerm(key) {
        if (typeof key !== 'string' || !key || key.trim() === '') {
            return null; // Return null instead of warning for invalid keys, since this is expected behavior in some cases
        }
        return this.terms.get(key);
    }

    getAllTerms() {
        return [...this.terms.values()];
    }

    async _addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (!tasksToAdd.length) return;

        const validTasks = this._filterValidTasks(tasksToAdd);
        if (!validTasks.length) return;

        await this._processValidTasks(validTasks);
    }

    _filterValidTasks(tasks) {
        const validTasks = [];
        const now = Date.now();

        for (const task of tasks) {
            if (this._isValidTask(task)) {
                validTasks.push(task);
            } else {
                this._handleInvalidTask(task, now);
            }
        }

        return validTasks;
    }

    _isValidTask(task) {
        return isTask(task);
    }

    _handleInvalidTask(task, now) {
        if (task == null) return;

        const taskSignature = this._getInvalidTaskSignature(task);
        const lastWarning = this._recentInvalidTaskWarnings.get(taskSignature);

        if (lastWarning && now - lastWarning <= this._invalidTaskWarningTimeout) return;

        const taskInfo = this._formatInvalidTaskInfo(task);
        warn(`Skipping invalid task: ${taskInfo}`);
        this._recentInvalidTaskWarnings.set(taskSignature, now);
        this._cleanupOldInvalidTaskWarnings(now);
    }

    _formatInvalidTaskInfo(task) {
        let taskInfo = typeof task;
        if (task && typeof task === 'object') {
            const relevantProps = [];
            if (task.hasOwnProperty('termKey')) relevantProps.push(`termKey:${task.termKey}`);
            if (task.hasOwnProperty('punctuation')) relevantProps.push(`punct:${task.punctuation}`);
            if (task.hasOwnProperty('id')) relevantProps.push(`id:${task.id}`);
            if (task.hasOwnProperty('type')) relevantProps.push(`type:${task.type}`);

            if (relevantProps.length > 0) {
                taskInfo += ` {${relevantProps.join(', ')}}`;
            } else {
                taskInfo += ` with ${Object.keys(task).length} properties`;
            }
        }
        return taskInfo;
    }

    async _processValidTasks(tasks) {
        for (const task of tasks) {
            this._storeTask(task);
            await this.eventBus.emitAsync(SystemEvents.TASK_ADD, task);
        }

        this._finalizeTaskProcessing(tasks.length);
    }

    _storeTask(task) {
        this.shortTermTasks.set(task.id, task);
        this.indexer.indexTask(task);
    }

    _finalizeTaskProcessing(count) {
        this._invalidateCachedTasks();
        debug(`Added ${count} tasks.`);
    }

    _getInvalidTaskSignature(task) {
        // Create a signature that identifies the "type" of invalid task
        if (task && typeof task === 'object') {
            // Include key properties that would identify the source/type of object
            const keys = Object.keys(task).sort();
            return `obj_${keys.length}_${JSON.stringify(keys)}`;
        }
        return `prim_${typeof task}`;
    }

    _cleanupOldInvalidTaskWarnings(now) {
        // Run cleanup when we have many entries to prevent memory issues
        if (this._recentInvalidTaskWarnings.size > 100) { // If we have many entries
            const cutoff = now - (this._invalidTaskWarningTimeout * 2); // 2x timeout
            for (const [signature, timestamp] of this._recentInvalidTaskWarnings.entries()) {
                if (timestamp < cutoff) {
                    this._recentInvalidTaskWarnings.delete(signature);
                }
            }
        }
    }

    getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    async _removeTask(taskId) {
        if (!taskId) return;
        const task = this.getTask(taskId);
        if (task) {
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            this.indexer.unindexTask(task);
            this._invalidateCachedTasks();
            await this.eventBus.emitAsync(SystemEvents.TASK_REMOVE, task);
        }
    }

    _getAllTasks() {
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [];
            this._updateCachedTasks();
        }
        return this._cachedAllTasks;
    }

    _updateCachedTasks() {
        this._cachedAllTasks = this._collectAllTasks();
    }

    _collectAllTasks() {
        const totalCount = this.shortTermTasks.size + this.longTermTasks.size;
        const result = new Array(totalCount);

        let index = 0;
        for (const task of this.shortTermTasks.values()) {
            result[index++] = task;
        }
        for (const task of this.longTermTasks.values()) {
            result[index++] = task;
        }

        return result;
    }

    _invalidateCachedTasks() {
        this._cachedAllTasks = null;
    }

    _shouldUsePriorityQueue(k, totalTasks) {
        const K_THRESHOLD = 50;
        const RATIO_THRESHOLD = 10;
        return k < K_THRESHOLD && k < totalTasks / RATIO_THRESHOLD;
    }

    _getHighestPriorityTasksWithPQ(tasks, k) {
        if (k <= 0) return [];

        const pq = new MinPriorityQueue({priority: task => task.state.priority});
        for (const task of tasks) {
            if (pq.size() < k) {
                pq.enqueue(task);
            } else if (task.state.priority > pq.front().priority) {
                pq.dequeue();
                pq.enqueue(task);
            }
        }

        return this._extractFromPriorityQueue(pq);
    }

    _extractFromPriorityQueue(pq) {
        const result = new Array(pq.size());
        let i = result.length - 1;
        while (!pq.isEmpty()) {
            result[i--] = pq.dequeue().element;
        }
        return result;
    }

    async _getHighestPriorityTasks(k = 20) {
        if (k <= 0) return [];

        const allTasks = await this.getAllTasks();
        if (k >= allTasks.length) {
            return [...allTasks].sort((a, b) => b.state.priority - a.state.priority);
        }

        return this._shouldUsePriorityQueue(k, allTasks.length)
            ? this._getHighestPriorityTasksWithPQ(allTasks, k)
            : [...allTasks].sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
    }

    async _clone() {
        const newMemory = new Memory(this.config, this.eventBus, this.commandBus);
        Object.assign(newMemory, {
            terms: new Map(this.terms),
            shortTermTasks: new Map(this.shortTermTasks),
            longTermTasks: new Map(this.longTermTasks),
            indexer: this.indexer.clone(),
            forgettingStrategy: this.forgettingStrategy,
            cycleCounter: this.cycleCounter,
        });
        return newMemory;
    }

    async _removeTerm(key) {
        const term = this.terms.get(key);
        if (!term) return;
        term.destroy?.();
        this.terms.delete(key);
        this.indexer.removeTerm(key);
        await this.eventBus.emitAsync(SystemEvents.TERM_REMOVE, {
            key
        });
    }

    async _clear() {
        this.terms.forEach(term => term.destroy?.());
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.indexer.clear();
        this.cycleCounter = 0;
        this._invalidateCachedTasks();
        await this.eventBus.emitAsync(SystemEvents.SYSTEM_RESET);
    }

    _getStatistics() {
        return {
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            ...this.indexer.getStatistics(),
        };
    }

    async _getTasksByPunctuation(punctuation) {
        const taskIds = this.indexer.punctuationIndex.get(punctuation);
        if (!taskIds) return [];

        // More efficient: pre-allocate result array and use direct lookup
        const result = [];
        for (const taskId of taskIds) {
            const task = this.shortTermTasks.get(taskId) || this.longTermTasks.get(taskId);
            if (task) {
                result.push(task);
            }
        }
        return result;
    }

    async _getRecentTasks(count = 10) {
        if (count <= 0) return [];

        const allTasks = await this.getAllTasks();
        if (count >= allTasks.length) {
            // If we want all or more tasks than we have, sort all and return
            return [...allTasks]
                .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime));
        }

        // For small count relative to total tasks, use a min-heap to efficiently
        // track the 'count' most recent tasks without sorting all
        const pq = new MinPriorityQueue({
            priority: task => Number(task.state.stamp.creationTime)
        });

        for (const task of allTasks) {
            if (pq.size() < count) {
                pq.enqueue(task);
            } else if (Number(task.state.stamp.creationTime) > pq.front().priority) {
                pq.dequeue();
                pq.enqueue(task);
            }
        }

        // Extract items in descending order - pre-allocate result array to avoid multiple allocations
        const result = new Array(pq.size());
        let i = result.length - 1;
        while (!pq.isEmpty()) {
            result[i--] = pq.dequeue().element;
        }
        return result;
    }

    async _queryTasks(filters = {}) {
        return this.indexer.queryTasks(await this.getAllTasks(), filters);
    }

    _exportState() {
        return JSON.stringify({
            terms: [...this.terms.values()],
            shortTermTasks: [...this.shortTermTasks.values()],
            longTermTasks: [...this.longTermTasks.values()],
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
    }

    _createTaskFromJSON(json) {
        if (!json?.termKey) return null;
        const term = this.getTerm(json.termKey);
        if (!term) return null;
        const deserializedStamp = {...json.state.stamp};
        Object.keys(deserializedStamp).forEach(key => {
            if (typeof deserializedStamp[key] === 'string' && /^\d+n?$/.test(deserializedStamp[key])) {
                deserializedStamp[key] = BigInt(deserializedStamp[key].replace('n', ''));
            }
        });
        const task = new Task(term, json.punctuation, json.state.truthValue, deserializedStamp);
        task.id = json.id;
        task.state.priority = json.state.priority;
        return task;
    }

    async _importState(jsonState) {
        if (typeof jsonState !== 'string') {
            await this.clear();
            return;
        }

        const state = this._parseState(jsonState);
        await this.clear();

        if (state.terms) {
            await this._restoreTerms(state.terms);
        }

        await this._restoreTasks(state.shortTermTasks, this.shortTermTasks);
        await this._restoreTasks(state.longTermTasks, this.longTermTasks);
        this._invalidateCachedTasks();
    }

    _parseState(jsonState) {
        try {
            return JSON.parse(jsonState);
        } catch (e) {
            throw createError.ParseError(`Invalid JSON provided to importState: ${e.message}`);
        }
    }

    async _restoreTerms(termsData) {
        for (const termData of termsData) {
            const term = Term.fromJSON(termData);
            if (term) await this.addTerm(term);
        }
    }

    async _restoreTasks(tasksData, taskMap) {
        if (!tasksData) return;
        for (const taskData of tasksData) {
            const task = this._createTaskFromJSON(taskData);
            if (task) {
                taskMap.set(task.id, task);
                this.indexer.indexTask(task);
            }
        }
    }
}

export default Memory;
