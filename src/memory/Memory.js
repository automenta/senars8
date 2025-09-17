import Term from '../core/Term.js';
import Task from '../core/Task.js';
import EventBus from '../system/EventBus.js';
import {normalizeToArray} from '../utils/helpers.js';
import {isTask} from '../utils/task-utils.js';
import {consolidateMemory, getHighestPriorityTasksWithPQ} from './memoryUtils.js';
import TimeBasedForgettingStrategy from './strategies/TimeBasedForgettingStrategy.js';
import {debug, warn} from '../utils/logger.js';
import MemoryIndexer from './MemoryIndexer.js';

const FORGETTING_STRATEGIES = {
    TimeBased: TimeBasedForgettingStrategy,
};

class Memory {
    constructor(configManager) {
        this.configManager = configManager;
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.indexer = new MemoryIndexer();
        this.cycleCounter = 0;
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
        const strategyName = this.configManager.getString('memory.FORGETTING_STRATEGY_NAME', 'TimeBased');
        const Strategy = FORGETTING_STRATEGIES[strategyName] || TimeBasedForgettingStrategy;
        this.forgettingStrategy = new Strategy();
    }

    _registerEventListeners() {
        EventBus.on('NewTasksCreated', tasks => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._performMaintenanceIfNeeded());
    }

    _performMaintenanceIfNeeded() {
        this.cycleCounter++;
        if (this.cycleCounter % this.configManager.getNumber('memory.MAINTENANCE_CYCLE_FREQUENCY', 10) === 0) {
            this._consolidateMemory();
            this._pruneMemory();
        }
    }

    _consolidateMemory() {
        const config = {
            memory: {
                CONSOLIDATION_PRIORITY_THRESHOLD: this.configManager.getNumber('memory.CONSOLIDATION_PRIORITY_THRESHOLD', 0.8),
                CONSOLIDATION_CONFIDENCE_THRESHOLD: this.configManager.getNumber('memory.CONSOLIDATION_CONFIDENCE_THRESHOLD', 0.9),
            }
        };
        const result = consolidateMemory(this.shortTermTasks, this.longTermTasks, config);
        this.shortTermTasks = result.shortTermTasks;
        this.longTermTasks = result.longTermTasks;
        this._invalidateTaskCache();
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;
        const options = this.configManager.getObject('memory.FORGETTING_STRATEGY_OPTIONS', {});
        this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
        this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        this._invalidateTaskCache();
    }

    _invalidateTaskCache() {
        this._cachedAllTasks = null;
    }

    addTerm(term) {
        if (!(term instanceof Term)) {
            throw new Error(`Can only add valid Term instances to memory. Received: ${typeof term}`);
        }
        if (this.terms.has(term.key)) {
            debug(`Term '${term.key}' already exists in memory, skipping addition`);
            return;
        }
        this.terms.set(term.key, term);
        this.indexer.indexTerm(term);
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

    addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (tasksToAdd.length === 0) {
            debug('No tasks to add to memory');
            return;
        }

        let addedCount = 0;
        for (const task of tasksToAdd) {
            if (!isTask(task)) {
                warn(`Skipping invalid task. Expected Task instance, received: ${typeof task}`);
                continue;
            }
            this.shortTermTasks.set(task.id, task);
            this.indexer.indexTask(task);
            addedCount++;
        }

        if (addedCount > 0) {
            this._invalidateTaskCache();
            debug(`Added ${addedCount} tasks to memory`);
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
            this.indexer.unindexTask(task);
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
        const newMemory = new Memory(this.configManager);
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.indexer = this.indexer.clone();
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
            this.indexer.removeTerm(key);
        }
    }

    clear() {
        for (const term of this.terms.values()) {
            if (typeof term.destroy === 'function') {
                term.destroy();
            }
        }
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.indexer.clear();
        this.cycleCounter = 0;
        this._invalidateTaskCache();
    }

    getStatistics() {
        return {
            terms: this.terms.size,
            shortTermTasks: this.shortTermTasks.size,
            longTermTasks: this.longTermTasks.size,
            ...this.indexer.getStatistics(),
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
        return [...allTasks]
            .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
            .slice(0, count);
    }

    queryTasks(filters = {}) {
        return this.indexer.queryTasks(this.getAllTasks(), filters);
    }

    exportState() {
        return JSON.stringify({
            terms: Array.from(this.terms.values()),
            shortTermTasks: Array.from(this.shortTermTasks.values()),
            longTermTasks: Array.from(this.longTermTasks.values()),
        }, null, 2);
    }

    _createTaskFromJSON(json) {
        if (!json?.termKey) return null;
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
                    this.indexer.indexTask(task);
                }
            }
        }
        if (state.longTermTasks) {
            for (const taskData of state.longTermTasks) {
                const task = this._createTaskFromJSON(taskData);
                if (task) {
                    this.longTermTasks.set(task.id, task);
                    this.indexer.indexTask(task);
                }
            }
        }
        this._invalidateTaskCache();
    }
}

export default Memory;
