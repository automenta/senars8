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

        this.addTerm = wrapAsync(this._addTerm.bind(this), 'Memory', 'addTerm', { rethrow: true });
        this.addTasks = wrapAsync(this._addTasks.bind(this), 'Memory', 'addTasks');
        this.removeTask = wrapAsync(this._removeTask.bind(this), 'Memory', 'removeTask');
        this.getAllTasks = wrapAsync(this._getAllTasks.bind(this), 'Memory', 'getAllTasks', { defaultValue: [] });
        this.getHighestPriorityTasks = wrapAsync(this._getHighestPriorityTasks.bind(this), 'Memory', 'getHighestPriorityTasks', { defaultValue: [] });
        this.clone = wrapAsync(this._clone.bind(this), 'Memory', 'clone', { defaultValue: null });
        this.removeTerm = wrapAsync(this._removeTerm.bind(this), 'Memory', 'removeTerm');
        this.clear = wrapAsync(this._clear.bind(this), 'Memory', 'clear');
        this.getStatistics = wrapAsync(this._getStatistics.bind(this), 'Memory', 'getStatistics', { defaultValue: {} });
        this.getBeliefs = wrapAsync(this._getTasksByPunctuation.bind(this, '.'), 'Memory', 'getBeliefs', { defaultValue: [] });
        this.getGoals = wrapAsync(this._getTasksByPunctuation.bind(this, '!'), 'Memory', 'getGoals', { defaultValue: [] });
        this.getQuestions = wrapAsync(this._getTasksByPunctuation.bind(this, '?'), 'Memory', 'getQuestions', { defaultValue: [] });
        this.getRecentTasks = wrapAsync(this._getRecentTasks.bind(this), 'Memory', 'getRecentTasks', { defaultValue: [] });
        this.queryTasks = wrapAsync(this._queryTasks.bind(this), 'Memory', 'queryTasks', { defaultValue: [] });
        this.exportState = wrapAsync(this._exportState.bind(this), 'Memory', 'exportState', { defaultValue: '{}' });
        this.importState = wrapAsync(this._importState.bind(this), 'Memory', 'importState', { rethrow: true });
    }

    _loadForgettingStrategy() {
        const strategyName = this.config.getString('memory.FORGETTING_STRATEGY_NAME', 'TimeBased');
        const Strategy = FORGETTING_STRATEGIES[strategyName] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new Strategy();
    }

    _registerEventListeners() {
        this.eventBus.on(SystemEvents.TASKS_ADD, async (tasks) => await this.addTasks(tasks));
        this.eventBus.on(SystemEvents.CYCLE_COMPLETE, () => this._performMaintenanceIfNeeded());
        this.eventBus.on(SystemEvents.TERM_ADD, async (terms) => {
            const termsToAdd = normalizeToArray(terms);
            for (const term of termsToAdd) {
                await this.addTerm(term);
            }
        });
        this.eventBus.on(SystemEvents.SYSTEM_RESET, async () => await this.clear());
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
        this.cycleCounter++;
        const frequency = this.config.getNumber('memory.MAINTENANCE_CYCLE_FREQUENCY', 10);
        if (this.cycleCounter % frequency === 0) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    _consolidateMemory() {
        const priorityThreshold = this.config.getNumber('memory.CONSOLIDATION_PRIORITY_THRESHOLD', 0.8);
        const confidenceThreshold = this.config.getNumber('memory.CONSOLIDATION_CONFIDENCE_THRESHOLD', 0.9);

        const newShortTermTasks = new Map();
        const newLongTermTasks = new Map(this.longTermTasks);

        for (const [taskId, task] of this.shortTermTasks.entries()) {
            if (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold) {
                newLongTermTasks.set(taskId, task);
            } else {
                newShortTermTasks.set(taskId, task);
            }
        }

        this.shortTermTasks = newShortTermTasks;
        this.longTermTasks = newLongTermTasks;
        this._invalidateCachedTasks();
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;
        const options = this.config.getObject('memory.FORGETTING_STRATEGY_OPTIONS', {});
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        this._invalidateCachedTasks();
    }

    // Old function removed - replaced with _invalidateCachedTasks()

    async _addTerm(term) {
        if (term === null || term === undefined || !(term instanceof Term)) {
            throw createError.ValidationError('Can only add valid Term instances to memory');
        }

        if (this.terms.has(term.key)) {
            debug(`Term '${term.key}' already exists, skipping.`);
            return;
        }
        this.terms.set(term.key, term);
        this.indexer.indexTerm(term);
        await this.eventBus.emitAsync(SystemEvents.TERM_ADD, term);
        debug(`Added term '${term.key}'.`);
    }

    getTerm(key) {
        if (typeof key !== 'string') {
            warn(`Invalid term key type: ${typeof key}.`);
            return null;
        }
        return this.terms.get(key);
    }

    getAllTerms() {
        return [...this.terms.values()];
    }

    async _addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (!tasksToAdd.length) return;

        let addedCount = 0;
        for (const task of tasksToAdd) {
            if (!isTask(task)) {
                warn(`Skipping invalid task: ${typeof task}`);
                continue;
            }
            this.shortTermTasks.set(task.id, task);
            this.indexer.indexTask(task);
            await this.eventBus.emitAsync(SystemEvents.TASK_ADD, task);
            addedCount++;
        }

        if (addedCount > 0) {
            this._invalidateCachedTasks();
            debug(`Added ${addedCount} tasks.`);
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
        const currentCount = this.shortTermTasks.size + this.longTermTasks.size;
        this._cachedAllTasks = new Array(currentCount);
        
        let index = 0;
        for (const task of this.shortTermTasks.values()) {
            this._cachedAllTasks[index++] = task;
        }
        for (const task of this.longTermTasks.values()) {
            this._cachedAllTasks[index++] = task;
        }
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
        const pq = new MinPriorityQueue({
            priority: task => task.state.priority
        });
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            if (pq.size() < k) {
                pq.enqueue(task);
            } else if (task.state.priority > pq.front().priority) {
                pq.dequeue();
                pq.enqueue(task);
            }
        }

        // Extract elements and reverse to get descending order - more efficient than unshift in loop
        // (unshift has O(k) complexity for each operation, leading to O(k²) total)
        const result = [];
        while (!pq.isEmpty()) {
            result.push(pq.dequeue().element);
        }
        return result.reverse(); // O(k) operation to reverse instead of O(k²) from multiple unshifts
    }

    async _getHighestPriorityTasks(k = 20) {
        if (k <= 0) return [];

        const allTasks = await this.getAllTasks();
        const totalTasks = allTasks.length;
        if (k >= totalTasks) {
            // Sort all tasks by priority in descending order
            return [...allTasks].sort((a, b) => b.state.priority - a.state.priority);
        }

        if (this._shouldUsePriorityQueue(k, totalTasks)) {
            return this._getHighestPriorityTasksWithPQ(allTasks, k);
        } else {
            // For larger k values relative to total tasks, partial sort is more efficient
            // Use a simple approach: sort and slice
            return [...allTasks]
                .sort((a, b) => b.state.priority - a.state.priority)
                .slice(0, k);
        }
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

        let state;
        try {
            state = JSON.parse(jsonState);
        } catch (e) {
            throw createError.ParseError(`Invalid JSON provided to importState: ${e.message}`);
        }

        await this.clear();
        if (state.terms) {
            for (const termData of state.terms) {
                const term = Term.fromJSON(termData);
                if (term) await this.addTerm(term);
            }
        }

        const processTasks = async (tasks, taskMap) => {
            if (!tasks) return;
            for (const taskData of tasks) {
                const task = this._createTaskFromJSON(taskData);
                if (task) {
                    taskMap.set(task.id, task);
                    this.indexer.indexTask(task);
                }
            }
        };

        await processTasks(state.shortTermTasks, this.shortTermTasks);
        await processTasks(state.longTermTasks, this.longTermTasks);
        this._invalidateCachedTasks();
    }
}

export default Memory;
