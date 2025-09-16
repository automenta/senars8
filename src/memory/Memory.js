import Term from '../core/Term.js';
import Task from '../core/Task.js';
import EventBus from '../system/EventBus.js';
import {
    isTask,
    normalizeToArray
} from '../utils/index.js';
import {
    debug,
    warn
} from '../utils/logger.js';
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

const FORGETTING_STRATEGIES = {
    'TimeBased': TimeBasedForgettingStrategy,
};

/**
 * Memory represents the cognitive system's knowledge storage and retrieval mechanism.
 * It manages both short-term and long-term memory, with automatic consolidation and forgetting.
 * The memory system uses multiple indexes for efficient querying and maintains semantic relationships.
 */
class Memory {
    /**
     * Creates a new Memory instance.
     * @param {object} config - Memory configuration options
     */
    constructor(config = defaultConfig.memory) {
        this.config = {
            ...defaultConfig.memory,
            ...config,
            FORGETTING_STRATEGY_OPTIONS: {
                ...defaultConfig.memory.FORGETTING_STRATEGY_OPTIONS,
                ...(config.FORGETTING_STRATEGY_OPTIONS || {}),
            }
        };

        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.implicationIndex = new Map();
        this.beliefIndex = new Map();
        this.costIndex = new Map();
        this.punctuationIndex = new Map();
        this.priorityIndex = new Map();
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
        const StrategyClass = FORGETTING_STRATEGIES[this.config.FORGETTING_STRATEGY_NAME] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new StrategyClass();
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

    _addToIndexMap(map, key, value) {
        if (!map.has(key)) {
            map.set(key, new Set());
        }
        map.get(key).add(value);
    }

    _removeFromIndexMap(map, key, value) {
        const set = map.get(key);
        if (set) {
            set.delete(value);
            if (set.size === 0) {
                map.delete(key);
            }
        }
    }

    addTerm(term) {
        if (!term || !(term instanceof Term)) {
            throw new Error(`Can only add valid Term instances to memory. Received: ${term}`);
        }
        if (this.terms.has(term.key)) {
            debug(`Term '${term.key}' already exists in memory, skipping addition`);
            return;
        }
        this.terms.set(term.key, term);
        this._indexImplication(term);
        debug(`Added term '${term.key}' to memory`);
    }

    getTerm(key) {
        if (typeof key !== 'string') {
            warn(`Invalid term key type: ${typeof key}. Expected string.`);
            return null;
        }
        return this.terms.get(key);
    }

    getAllTerms() {
        return Array.from(this.terms.values());
    }

    _indexTask(task) {
        this.beliefIndex = indexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'add');
        this._addToIndexMap(this.punctuationIndex, task.punctuation, task.id);
        const priorityBucket = Math.floor(task.state.priority * 10);
        this._addToIndexMap(this.priorityIndex, priorityBucket, task.id);
    }

    _unindexTask(task) {
        this.beliefIndex = unindexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'remove');
        this._removeFromIndexMap(this.punctuationIndex, task.punctuation, task.id);
        const priorityBucket = Math.floor(task.state.priority * 10);
        this._removeFromIndexMap(this.priorityIndex, priorityBucket, task.id);
    }

    addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (tasksToAdd.length === 0) return;

        for (const task of tasksToAdd) {
            if (!isTask(task)) {
                warn(`Skipping invalid task. Expected Task instance, received: ${task}`);
                continue;
            }
            this.shortTermTasks.set(task.id, task);
            this._indexTask(task);
        }

        if (tasksToAdd.length > 0) {
            this._invalidateTaskCache();
            debug(`Added ${tasksToAdd.length} tasks to memory`);
        }
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
        newMemory.beliefIndex = new Map(Array.from(this.beliefIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.punctuationIndex = new Map(Array.from(this.punctuationIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.priorityIndex = new Map(Array.from(this.priorityIndex.entries()).map(([key, value]) => [key, new Set(value)]));
        newMemory.forgettingStrategy = this.forgettingStrategy;
        newMemory.cycleCounter = this.cycleCounter;
        return newMemory;
    }

    removeTerm(key) {
        const term = this.terms.get(key);
        if (term) {
            if (typeof term.destroy === 'function') {
                term.destroy();
            }
            this.terms.delete(key);

            this.implicationIndex.delete(key);
            this.beliefIndex.delete(key);
            this.costIndex.delete(key);
        }
    }

    clear() {
        this.terms.forEach(term => typeof term.destroy === 'function' && term.destroy());

        [this.terms, this.shortTermTasks, this.longTermTasks,
            this.implicationIndex, this.beliefIndex, this.costIndex,
            this.punctuationIndex, this.priorityIndex
        ].forEach(map => map.clear());

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
        return [...this.getAllTasks()]
            .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
            .slice(0, count);
    }

    queryTasks(filters = {}) {
        let candidateTasks;
        if (filters.punctuation) {
            if (!['.', '!', '?'].includes(filters.punctuation)) return [];
            const taskIds = this.punctuationIndex.get(filters.punctuation) || new Set();
            candidateTasks = Array.from(taskIds).map(id => this.getTask(id)).filter(Boolean);
        } else {
            candidateTasks = this.getAllTasks();
        }

        let filteredTasks = candidateTasks;
        if (filters.termKey) {
            filteredTasks = filteredTasks.filter(task => task.termKey === filters.termKey);
        }
        if (filters.minPriority !== undefined) {
            filteredTasks = filteredTasks.filter(task => task.state.priority >= filters.minPriority);
        }
        if (filters.minConfidence !== undefined) {
            filteredTasks = filteredTasks.filter(task => task.state.truthValue.confidence >= filters.minConfidence);
        }

        filteredTasks.sort((a, b) => b.state.priority - a.state.priority);

        return filters.limit !== undefined ? filteredTasks.slice(0, filters.limit) : filteredTasks;
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
        const deserializedStamp = {
            ...json.state.stamp
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
