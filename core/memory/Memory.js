import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import Term from '../core/Term.js';
import Task from '../core/Task.js';
import {normalizeToArray} from '../utils/collections/index.js';
import {isTask} from '../utils/task-utils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../utils/logger.js';
import MemoryIndexer from './MemoryIndexer.js';
import {createError, createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {SystemEvents} from '../system/SystemEvents.js';
import {SystemCommands} from '../system/SystemCommands.js';

const errorHandler = createUnifiedErrorHandler('Memory');

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
        this._cachedTaskCount = 0;
        this._loadForgettingStrategy();
        this._registerEventListeners();
        this._registerCommandHandlers();
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
        this._invalidateTaskCache();
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;
        const options = this.config.getObject('memory.FORGETTING_STRATEGY_OPTIONS', {});
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        this._invalidateTaskCache();
    }

    _invalidateTaskCache() {
        this._cachedAllTasks = null;
        this._cachedTaskCount = this.shortTermTasks.size + this.longTermTasks.size;
    }

    async addTerm(term) {
        if (term === null || term === undefined || !(term instanceof Term)) {
            throw createError.ValidationError('Can only add valid Term instances to memory');
        }

        await errorHandler.execute(async () => {
            if (this.terms.has(term.key)) {
                debug(`Term '${term.key}' already exists, skipping.`);
                return;
            }
            this.terms.set(term.key, term);
            this.indexer.indexTerm(term);
            await this.eventBus.emitAsync(SystemEvents.TERM_ADD, term);
            debug(`Added term '${term.key}'.`);
        }, 'addTerm');
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

    async addTasks(tasks) {
        await errorHandler.execute(async () => {
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
                this._invalidateTaskCache();
                debug(`Added ${addedCount} tasks.`);
            }
        }, 'addTasks');
    }

    getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    async removeTask(taskId) {
        await errorHandler.execute(async () => {
            if (!taskId) return;
            const task = this.getTask(taskId);
            if (task) {
                this.shortTermTasks.delete(taskId);
                this.longTermTasks.delete(taskId);
                this.indexer.unindexTask(task);
                this._invalidateTaskCache();
                await this.eventBus.emitAsync(SystemEvents.TASK_REMOVE, task);
            }
        }, 'removeTask');
    }

    async getAllTasks() {
        return errorHandler.execute(async () => {
            const currentCount = this.shortTermTasks.size + this.longTermTasks.size;
            if (!this._cachedAllTasks || this._cachedTaskCount !== currentCount) {
                this._cachedAllTasks = Array.from(this.shortTermTasks.values());
                for (const task of this.longTermTasks.values()) {
                    this._cachedAllTasks.push(task);
                }
                this._cachedTaskCount = currentCount;
            }
            return this._cachedAllTasks;
        }, 'getAllTasks', []);
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

        // Instead of converting to array and then sorting, extract elements in priority order
        const result = [];
        while (!pq.isEmpty()) {
            result.unshift(pq.dequeue().element);  // Add to beginning to maintain descending order
        }
        return result;
    }

    async getHighestPriorityTasks(k = 20) {
        return errorHandler.execute(async () => {
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
        }, 'getHighestPriorityTasks', []);
    }

    async clone() {
        return errorHandler.execute(async () => {
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
        }, 'clone', null);
    }

    async removeTerm(key) {
        await errorHandler.execute(async () => {
            const term = this.terms.get(key);
            if (!term) return;
            term.destroy?.();
            this.terms.delete(key);
            this.indexer.removeTerm(key);
            await this.eventBus.emitAsync(SystemEvents.TERM_REMOVE, {
                key
            });
        }, 'removeTerm');
    }

    async clear() {
        await errorHandler.execute(async () => {
            this.terms.forEach(term => term.destroy?.());
            this.terms.clear();
            this.shortTermTasks.clear();
            this.longTermTasks.clear();
            this.indexer.clear();
            this.cycleCounter = 0;
            this._invalidateTaskCache();
            await this.eventBus.emitAsync(SystemEvents.SYSTEM_RESET);
        }, 'clear');
    }

    async getStatistics() {
        return errorHandler.execute(async () => ({
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            ...this.indexer.getStatistics(),
        }), 'getStatistics', {});
    }

    async _getTasksByPunctuation(punctuation, methodName) {
        return errorHandler.execute(async () => {
            const taskIds = this.indexer.punctuationIndex.get(punctuation);
            if (!taskIds) return [];

            const result = [];
            for (const taskId of taskIds) {
                const task = this.getTask(taskId);
                if (task) {
                    result.push(task);
                }
            }
            return result;
        }, methodName, []);
    }

    async getBeliefs() {
        return await this._getTasksByPunctuation('.', 'getBeliefs');
    }

    async getGoals() {
        return await this._getTasksByPunctuation('!', 'getGoals');
    }

    async getQuestions() {
        return await this._getTasksByPunctuation('?', 'getQuestions');
    }

    async getRecentTasks(count = 10) {
        return errorHandler.execute(async () => {
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
            
            // Extract items and sort them by recency (most recent first)
            const result = [];
            while (!pq.isEmpty()) {
                result.unshift(pq.dequeue().element); // Add to beginning for descending order
            }
            
            return result;
        }, 'getRecentTasks', []);
    }

    async queryTasks(filters = {}) {
        return errorHandler.execute(async () => this.indexer.queryTasks(await this.getAllTasks(), filters), 'queryTasks', []);
    }

    async exportState() {
        return errorHandler.execute(async () => JSON.stringify({
            terms: [...this.terms.values()],
            shortTermTasks: [...this.shortTermTasks.values()],
            longTermTasks: [...this.longTermTasks.values()],
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2), 'exportState', '{}');
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

    async importState(jsonState) {
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
        this._invalidateTaskCache();
    }
}

export default Memory;
