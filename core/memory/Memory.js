import {MinPriorityQueue} from '@datastructures-js/priority-queue';
import Term from '../core/Term.js';
import Task from '../core/Task.js';
import {normalizeToArray} from '../utils/collections/index.js';
import {isTask} from '../utils/task-utils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../utils/logger.js';
import MemoryIndexer from './MemoryIndexer.js';
import {createError, createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('Memory');

const FORGETTING_STRATEGIES = {
    TimeBased: TimeBasedForgettingStrategy,
};

class Memory {
    constructor(configManager, eventBus) {
        this.config = configManager;
        this.eventBus = eventBus;
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.indexer = new MemoryIndexer();
        this.cycleCounter = 0;
        this._cachedAllTasks = null;
        this._cachedTaskCount = 0;
        this._loadForgettingStrategy();
        this._registerEventListeners();
    }

    _loadForgettingStrategy() {
        const strategyName = this.config.getString('memory.FORGETTING_STRATEGY_NAME', 'TimeBased');
        const Strategy = FORGETTING_STRATEGIES[strategyName] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new Strategy();
    }

    _registerEventListeners() {
        this.eventBus.on('tasks.add', tasks => this.addTasks(tasks));
        this.eventBus.on('SystemCycleEnded', () => this._performMaintenanceIfNeeded());
        this.eventBus.on('term.add', term => this.addTerm(term));
        this.eventBus.on('system.reset', () => this.clear());
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

    addTerm(term) {
        // For validation errors, we throw directly to match test expectations
        if (term === null || term === undefined) {
            throw createError.ValidationError('Can only add valid Term instances to memory');
        }
        if (!(term instanceof Term)) {
            throw createError.ValidationError('Can only add valid Term instances to memory');
        }

        return errorHandler.executeSync(() => {
            if (this.terms.has(term.key)) {
                debug(`Term '${term.key}' already exists, skipping.`);
                return;
            }
            this.terms.set(term.key, term);
            this.indexer.indexTerm(term);
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

    addTasks(tasks) {
        return errorHandler.executeSync(() => {
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

    removeTask(taskId) {
        return errorHandler.executeSync(() => {
            if (!taskId) return;
            const task = this.getTask(taskId);
            if (task) {
                this.shortTermTasks.delete(taskId);
                this.longTermTasks.delete(taskId);
                this.indexer.unindexTask(task);
                this._invalidateTaskCache();
            }
        }, 'removeTask');
    }

    getAllTasks() {
        return errorHandler.executeSync(() => {
            const currentCount = this.shortTermTasks.size + this.longTermTasks.size;
            if (!this._cachedAllTasks || this._cachedTaskCount !== currentCount) {
                // More efficient way to concatenate iterators without creating intermediate arrays
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
        
        // Get elements from priority queue and sort in descending order of priority
        const pqElements = pq.toArray();
        const result = new Array(pqElements.length);
        for (let i = 0; i < pqElements.length; i++) {
            result[i] = pqElements[i].element;
        }
        
        // Sort in descending order of priority
        result.sort((a, b) => b.state.priority - a.state.priority);
        return result;
    }

    getHighestPriorityTasks(k = 20) {
        return errorHandler.executeSync(() => {
            if (k <= 0) return [];
            
            // Use cached tasks to avoid potential recalculation
            const allTasks = this.getAllTasks();
            if (k >= allTasks.length) {
                // If k is larger than all tasks, just sort and return everything
                const result = new Array(allTasks.length);
                for (let i = 0; i < allTasks.length; i++) {
                    result[i] = allTasks[i];
                }
                return result.sort((a, b) => b.state.priority - a.state.priority);
            }
            
            if (this._shouldUsePriorityQueue(k, allTasks.length)) {
                return this._getHighestPriorityTasksWithPQ(allTasks, k);
            } else {
                // Create a copy of allTasks to avoid modifying the cached array
                const result = new Array(allTasks.length);
                for (let i = 0; i < allTasks.length; i++) {
                    result[i] = allTasks[i];
                }
                return result.sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
            }
        }, 'getHighestPriorityTasks', []);
    }

    clone() {
        return errorHandler.executeSync(() => {
            const newMemory = new Memory(this.config, this.eventBus);
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

    removeTerm(key) {
        return errorHandler.executeSync(() => {
            const term = this.terms.get(key);
            if (!term) return;
            term.destroy?.();
            this.terms.delete(key);
            this.indexer.removeTerm(key);
        }, 'removeTerm');
    }

    clear() {
        return errorHandler.executeSync(() => {
            this.terms.forEach(term => term.destroy?.());
            this.terms.clear();
            this.shortTermTasks.clear();
            this.longTermTasks.clear();
            this.indexer.clear();
            this.cycleCounter = 0;
            this._invalidateTaskCache();
        }, 'clear');
    }

    getStatistics() {
        return errorHandler.executeSync(() => ({
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            ...this.indexer.getStatistics(),
        }), 'getStatistics', {});
    }

    /**
     * Private helper method to reduce duplication in task retrieval by punctuation.
     * @param {string} punctuation - The punctuation character to filter tasks by ('.', '!', '?')
     * @param {string} methodName - The name of the calling method for error reporting
     * @returns {Array} - Array of tasks with the specified punctuation
     */
    _getTasksByPunctuation(punctuation, methodName) {
        return errorHandler.executeSync(() => {
            const taskIds = this.indexer.punctuationIndex.get(punctuation);
            if (!taskIds) return [];
            
            // More efficient approach: directly retrieve tasks from both maps instead of getting all tasks
            const result = [];
            for (const taskId of taskIds) {
                const task = this.shortTermTasks.get(taskId) || this.longTermTasks.get(taskId);
                if (task) {
                    result.push(task);
                }
            }
            return result;
        }, methodName, []);
    }

    getBeliefs() {
        return this._getTasksByPunctuation('.', 'getBeliefs');
    }

    getGoals() {
        return this._getTasksByPunctuation('!', 'getGoals');
    }

    getQuestions() {
        return this._getTasksByPunctuation('?', 'getQuestions');
    }

    getRecentTasks(count = 10) {
        return errorHandler.executeSync(() => {
            const allTasks = this.getAllTasks();
            return [...allTasks]
                .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
                .slice(0, count);
        }, 'getRecentTasks', []);
    }

    queryTasks(filters = {}) {
        return errorHandler.executeSync(() => this.indexer.queryTasks(this.getAllTasks(), filters), 'queryTasks', []);
    }

    exportState() {
        return errorHandler.executeSync(() => JSON.stringify({
            terms: [...this.terms.values()],
            shortTermTasks: [...this.shortTermTasks.values()],
            longTermTasks: [...this.longTermTasks.values()],
        }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2), 'exportState', '{}');
    }

    _createTaskFromJSON(json) {
        return errorHandler.executeSync(() => {
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
        }, '_createTaskFromJSON', null);
    }

    importState(jsonState) {
        // For invalid JSON, we throw directly to match test expectations
        if (typeof jsonState !== 'string') {
            return errorHandler.executeSync(() => {
                this.clear();
            }, 'importState');
        }

        // For invalid JSON, we throw directly to match test expectations
        let state;
        try {
            state = JSON.parse(jsonState);
        } catch (e) {
            throw createError.ParseError(`Invalid JSON provided to importState: ${e.message}`);
        }

        return errorHandler.executeSync(() => {
            this.clear();
            state.terms?.forEach(termData => {
                const term = Term.fromJSON(termData);
                if (term) this.addTerm(term);
            });
            const processTasks = (tasks, taskMap) => {
                tasks?.forEach(taskData => {
                    const task = this._createTaskFromJSON(taskData);
                    if (task) {
                        taskMap.set(task.id, task);
                        this.indexer.indexTask(task);
                    }
                });
            };
            processTasks(state.shortTermTasks, this.shortTermTasks);
            processTasks(state.longTermTasks, this.longTermTasks);
            this._invalidateTaskCache();
        }, 'importState');
    }
}

export default Memory;
