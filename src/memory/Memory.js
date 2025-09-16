import Term from '../core/Term.js';
import Task from '../core/Task.js';
import EventBus from '../system/EventBus.js';
import {normalizeToArray} from '../utils/helpers.js';
import {isTask} from '../utils/task-utils.js';
import {
    consolidateMemory,
    getHighestPriorityTasksWithPQ,
    indexImplication,
    indexTask,
unindexTask,
updateCostIndex
} from './memoryUtils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import defaultConfig from '../config/default-config.js';

class Memory {
    constructor(config = defaultConfig.memory) {
        this.config = config;

        // Core data structures
        this.terms = new Map(); // Term key -> Term
        this.shortTermTasks = new Map(); // Task ID -> Task (recently accessed)
        this.longTermTasks = new Map(); // Task ID -> Task (persisted)

        // Indexes for efficient querying
        this.implicationIndex = new Map(); // Term key -> Set of implication terms
        this.beliefIndex = new Map(); // Term key -> Set of belief tasks
        this.costIndex = new Map(); // Term key -> cost information
        this.punctuationIndex = new Map(); // Punctuation type -> Set of task IDs
        this.priorityIndex = new Map(); // Priority bucket -> Set of task IDs

        // Maintenance state
        this.cycleCounter = 0;
        this.maintenanceFrequency = this.config.MAINTENANCE_CYCLE_FREQUENCY;
        this._cachedAllTasks = null;

        this._loadForgettingStrategy();
        this._registerEventListeners();
    }

    static getForwardableMethods() {
        return [
            'getMemoryStatistics', 'findTasksByTermKey', 'getHighPriorityTasks',
            'getTask', 'getTerm', 'getAllTasks', 'getAllTerms', 'getBeliefs',
            'getGoals', 'getQuestions', 'getTopPriorityTasks', 'getRecentTasks',
            'queryTasks', 'removeTask', 'exportState', 'importState'
        ];
    }

    _loadForgettingStrategy() {
        const strategyName = this.config.FORGETTING_STRATEGY_NAME;
        if (strategyName === 'TimeBased') {
            this.forgettingStrategy = new TimeBasedForgettingStrategy();
        } else {
            // Default or extend with more strategies
            this.forgettingStrategy = new TimeBasedForgettingStrategy();
        }
    }

    _registerEventListeners() {
        EventBus.on('NewTasksCreated', tasks => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._performMaintenanceIfNeeded());
    }

    _performMaintenanceIfNeeded() {
        this.cycleCounter++;
        if (this.cycleCounter % this.maintenanceFrequency === 0) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    _consolidateMemory() {
        const result = consolidateMemory(this.shortTermTasks, this.longTermTasks, this.config);
        this.shortTermTasks = result.shortTermTasks;
        this.longTermTasks = result.longTermTasks;
        this._invalidateTaskCache();
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;
        const options = this.config.FORGETTING_STRATEGY_OPTIONS || {};
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        this._invalidateTaskCache();
    }

    _invalidateTaskCache() {
        this._cachedAllTasks = null;
    }

    _indexImplication(term) {
        this.implicationIndex = indexImplication(term, this.implicationIndex);
    }

    addTerm(term) {
        if (!term || !(term instanceof Term)) {
            throw new Error('Can only add valid Term instances to memory.');
        }
        if (this.terms.has(term.key)) return;
        this.terms.set(term.key, term);
        this._indexImplication(term);
    }

    getTerm(key) {
        return this.terms.get(key);
    }

    getAllTerms() {
        return Array.from(this.terms.values());
    }

    _indexTask(task) {
        this.beliefIndex = indexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'add');
        if (!this.punctuationIndex.has(task.punctuation)) {
            this.punctuationIndex.set(task.punctuation, new Set());
        }
        this.punctuationIndex.get(task.punctuation).add(task.id);
        const priorityBucket = Math.floor(task.state.priority * 10);
        if (!this.priorityIndex.has(priorityBucket)) {
            this.priorityIndex.set(priorityBucket, new Set());
        }
        this.priorityIndex.get(priorityBucket).add(task.id);
    }

    _unindexTask(task) {
        this.beliefIndex = unindexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'remove');
        if (this.punctuationIndex.has(task.punctuation)) {
            this.punctuationIndex.get(task.punctuation).delete(task.id);
            if (this.punctuationIndex.get(task.punctuation).size === 0) {
                this.punctuationIndex.delete(task.punctuation);
            }
        }
        const priorityBucket = Math.floor(task.state.priority * 10);
        if (this.priorityIndex.has(priorityBucket)) {
            this.priorityIndex.get(priorityBucket).delete(task.id);
            if (this.priorityIndex.get(priorityBucket).size === 0) {
                this.priorityIndex.delete(priorityBucket);
            }
        }
    }

    addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (tasksToAdd.length === 0) return;
        for (const task of tasksToAdd) {
            if (!task || !isTask(task)) {
                throw new Error('Can only add valid Task instances to memory.');
            }
            this.shortTermTasks.set(task.id, task);
            this._indexTask(task);
        }
        this._invalidateTaskCache();
    }

    getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    removeTask(taskId) {
        if (!taskId) return;
        const task = this.getTask(taskId);
        if (task) {
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            this._unindexTask(task);
            this._invalidateTaskCache();
        }
    }

    getAllTasks() {
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [...this.shortTermTasks.values(), ...this.longTermTasks.values()];
        }
        return this._cachedAllTasks;
    }

    _shouldUsePriorityQueue(k, totalTasks) {
        const K_THRESHOLD = 50;
        const RATIO_THRESHOLD = 10;
        return k < K_THRESHOLD && k < totalTasks / RATIO_THRESHOLD;
    }

    getHighestPriorityTasks(k = 20) {
        if (k <= 0) return [];
        const allTasks = this.getAllTasks();
        if (this._shouldUsePriorityQueue(k, allTasks.length)) {
            return getHighestPriorityTasksWithPQ(allTasks, k);
        }
        return [...allTasks].sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
    }

    clone() {
        const newMemory = new Memory(this.config);
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        newMemory.beliefIndex = new Map(Array.from(this.beliefIndex.entries()).map(([key, value]) => [key, [...value]]));
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.punctuationIndex = new Map(Array.from(this.punctuationIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.priorityIndex = new Map(Array.from(this.priorityIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.forgettingStrategy = this.forgettingStrategy;
        newMemory.cycleCounter = this.cycleCounter;
        return newMemory;
    }

    clear() {
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.implicationIndex.clear();
        this.beliefIndex.clear();
        this.costIndex.clear();
        this.punctuationIndex.clear();
        this.priorityIndex.clear();
        this.cycleCounter = 0;
        this._invalidateTaskCache();
    }

    getStatistics() {
        return {
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            implications: this.implicationIndex.size,
            beliefs: this.beliefIndex.size,
            costs: this.costIndex.size
        };
    }

    getBeliefs() {
        return this.queryTasks({
            punctuation: '.'
        });
    }

    getGoals() {
        return this.queryTasks({
            punctuation: '!'
        });
    }

    getQuestions() {
        return this.queryTasks({
            punctuation: '?'
        });
    }

    getRecentTasks(count = 10) {
        const allTasks = this.getAllTasks();
        if (allTasks.length <= count) {
            return [...allTasks].sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime));
        }
        return [...allTasks]
            .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
            .slice(0, count);
    }

    queryTasks(filters = {}) {
        let tasks;
        if (filters.punctuation && this.punctuationIndex.has(filters.punctuation)) {
            const taskIds = this.punctuationIndex.get(filters.punctuation);
            tasks = Array.from(taskIds).map(id => this.getTask(id)).filter(Boolean);
        } else {
            tasks = this.getAllTasks();
        }
        if (filters.termKey) {
            tasks = tasks.filter(task => task.termKey === filters.termKey);
        }
        if (filters.minPriority !== undefined) {
            tasks = tasks.filter(task => task.state.priority >= filters.minPriority);
        }
        if (filters.minConfidence !== undefined) {
            tasks = tasks.filter(task => task.state.truthValue.confidence >= filters.minConfidence);
        }
        tasks.sort((a, b) => b.state.priority - a.state.priority);
        if (filters.limit !== undefined) {
            tasks = tasks.slice(0, filters.limit);
        }
        return tasks;
    }

    exportState() {
        return JSON.stringify({
            terms: Array.from(this.terms.values()),
            shortTermTasks: Array.from(this.shortTermTasks.values()),
            longTermTasks: Array.from(this.longTermTasks.values())
        }, null, 2);
    }

    _createTaskFromJSON(json) {
        if (!json || !json.termKey) return null;
        const term = this.getTerm(json.termKey);
        if (!term) return null;
        const deserializedStamp = { ...json.state.stamp
        };
        for (const key in deserializedStamp) {
            if (typeof deserializedStamp[key] === 'string' && /^\d+$/.test(deserializedStamp[key])) {
                deserializedStamp[key] = BigInt(deserializedStamp[key]);
            }
        }
        const task = new Task(term, json.punctuation, json.state.truthValue, deserializedStamp);
        task.id = json.id;
        task.state.priority = json.state.priority;
        return task;
    }

    importState(jsonState) {
        const state = JSON.parse(jsonState);
        this.clear();
        if (state.terms) {
            for (const termData of state.terms) {
                const term = Term.fromJSON(termData);
                if (term) this.addTerm(term);
            }
        }
        if (state.shortTermTasks) {
            for (const taskData of state.shortTermTasks) {
                const task = this._createTaskFromJSON(taskData);
                if (task) {
                    this.shortTermTasks.set(task.id, task);
                    this._indexTask(task);
                }
            }
        }
        if (state.longTermTasks) {
            for (const taskData of state.longTermTasks) {
                const task = this._createTaskFromJSON(taskData);
                if (task) {
                    this.longTermTasks.set(task.id, task);
                    this._indexTask(task);
                }
            }
        }
        this._invalidateTaskCache();
    }
}

export default Memory;
