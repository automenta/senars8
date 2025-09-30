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
        this.eventBus.on(SystemEvents.TASKS_ADD, async (tasks) => await this._addTasks(tasks));
        this.eventBus.on(SystemEvents.CYCLE_COMPLETE, () => this._performMaintenanceIfNeeded());
        this.eventBus.on(SystemEvents.TERM_ADD, async (terms) => {
            const termsToAdd = normalizeToArray(terms);
            for (const term of termsToAdd) {
                await this._addTerm(term);
            }
        });
        this.eventBus.on(SystemEvents.SYSTEM_RESET, async () => await this._clear());
    }

    _registerCommandHandlers() {
        const commandMap = {
            [SystemCommands.MEMORY_ADD_TERM]: this._addTerm,
            [SystemCommands.MEMORY_REMOVE_TERM]: this._removeTerm,
            [SystemCommands.MEMORY_ADD_TASKS]: this._addTasks,
            [SystemCommands.MEMORY_REMOVE_TASK]: this._removeTask,
            [SystemCommands.MEMORY_GET_TASK]: this._getTask,
            [SystemCommands.MEMORY_GET_TERM]: this._getTerm,
            [SystemCommands.MEMORY_GET_ALL_TASKS]: this._getAllTasks,
            [SystemCommands.MEMORY_GET_ALL_TERMS]: this._getAllTerms,
            [SystemCommands.MEMORY_GET_STATS]: this._getStatistics,
            [SystemCommands.MEMORY_GET_HIGHEST_PRIORITY_TASKS]: this._getHighestPriorityTasks,
            [SystemCommands.MEMORY_GET_BELIEFS]: this._getBeliefs,
            [SystemCommands.MEMORY_GET_GOALS]: this._getGoals,
            [SystemCommands.MEMORY_GET_QUESTIONS]: this._getQuestions,
            [SystemCommands.MEMORY_GET_RECENT_TASKS]: this._getRecentTasks,
            [SystemCommands.MEMORY_QUERY_TASKS]: this._queryTasks,
            [SystemCommands.MEMORY_EXPORT_STATE]: this._exportState,
            [SystemCommands.MEMORY_IMPORT_STATE]: this._importState,
            [SystemCommands.MEMORY_GET_IMPLICATIONS]: this._getImplications,
            [SystemCommands.MEMORY_GET_COST]: this._getCost,
        };

        for (const [command, handler] of Object.entries(commandMap)) {
            this.commandBus.handle(command, handler.bind(this));
        }
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

    async _addTerm(term) {
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
            // The event should be emitted by the caller that initiated the term addition
            // await this.eventBus.emitAsync(SystemEvents.TERM_ADD, term);
            debug(`Added term '${term.key}'.`);
        }, '_addTerm');
    }

    _getTerm(key) {
        if (typeof key !== 'string') {
            warn(`Invalid term key type: ${typeof key}.`);
            return null;
        }
        return this.terms.get(key);
    }

    _getAllTerms() {
        return [...this.terms.values()];
    }

    async _addTasks(tasks) {
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
        }, '_addTasks');
    }

    _getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    async _removeTask(taskId) {
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
        }, '_removeTask');
    }

    async _getAllTasks() {
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
        }, '_getAllTasks', []);
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

        const pqElements = pq.toArray();
        const result = new Array(pqElements.length);
        for (let i = 0; i < pqElements.length; i++) {
            result[i] = pqElements[i].element;
        }

        result.sort((a, b) => b.state.priority - a.state.priority);
        return result;
    }

    async _getHighestPriorityTasks(k = 20) {
        return errorHandler.execute(async () => {
            if (k <= 0) return [];

            const allTasks = await this._getAllTasks();
            if (k >= allTasks.length) {
                const result = new Array(allTasks.length);
                for (let i = 0; i < allTasks.length; i++) {
                    result[i] = allTasks[i];
                }
                return result.sort((a, b) => b.state.priority - a.state.priority);
            }

            if (this._shouldUsePriorityQueue(k, allTasks.length)) {
                return this._getHighestPriorityTasksWithPQ(allTasks, k);
            } else {
                const result = new Array(allTasks.length);
                for (let i = 0; i < allTasks.length; i++) {
                    result[i] = allTasks[i];
                }
                return result.sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
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

    async _removeTerm(key) {
        await errorHandler.execute(async () => {
            const term = this.terms.get(key);
            if (!term) return;
            term.destroy?.();
            this.terms.delete(key);
            this.indexer.removeTerm(key);
            await this.eventBus.emitAsync(SystemEvents.TERM_REMOVE, {
                key
            });
        }, '_removeTerm');
    }

    async _clear() {
        await errorHandler.execute(async () => {
            this.terms.forEach(term => term.destroy?.());
            this.terms.clear();
            this.shortTermTasks.clear();
            this.longTermTasks.clear();
            this.indexer.clear();
            this.cycleCounter = 0;
            this._invalidateTaskCache();
            await this.eventBus.emitAsync(SystemEvents.SYSTEM_RESET);
        }, '_clear');
    }

    async _getStatistics() {
        return errorHandler.execute(async () => ({
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            ...this.indexer.getStatistics(),
        }), '_getStatistics', {});
    }

    async _getImplications(goalKey) {
        return this.indexer.implicationIndex.get(goalKey) || [];
    }

    async _getCost(actionKey) {
        return this.indexer.costIndex.get(actionKey);
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

    async _getBeliefs() {
        return await this._getTasksByPunctuation('.', '_getBeliefs');
    }

    async _getGoals() {
        return await this._getTasksByPunctuation('!', '_getGoals');
    }

    async _getQuestions() {
        return await this._getTasksByPunctuation('?', '_getQuestions');
    }

    async _getRecentTasks(count = 10) {
        return errorHandler.execute(async () => {
            const allTasks = await this._getAllTasks();
            return [...allTasks]
                .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
                .slice(0, count);
        }, '_getRecentTasks', []);
    }

    async _queryTasks(filters = {}) {
        return errorHandler.execute(async () => this.indexer.queryTasks(await this._getAllTasks(), filters), '_queryTasks', []);
    }

    async _exportState() {
        return errorHandler.execute(async () => JSON.stringify({
            terms: [...this.terms.values()],
            shortTermTasks: [...this.shortTermTasks.values()],
            longTermTasks: [...this.longTermTasks.values()],
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2), '_exportState', '{}');
    }

    _createTaskFromJSON(json) {
        if (!json?.termKey) return null;
        const term = this._getTerm(json.termKey);
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
            await this._clear();
            return;
        }

        let state;
        try {
            state = JSON.parse(jsonState);
        } catch (e) {
            throw createError.ParseError(`Invalid JSON provided to importState: ${e.message}`);
        }

        await this._clear();
        if (state.terms) {
            for (const termData of state.terms) {
                const term = Term.fromJSON(termData);
                if (term) await this._addTerm(term);
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
