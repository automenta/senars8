const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');
const config = require('../config');
const {normalizeToArray} = require('../utils/array-utils');
const {
    consolidateMemory,
    updateCostIndex,
    indexImplication,
    indexTask,
    unindexTask,
    getHighestPriorityTasksWithPQ
} = require('./memoryUtils');

class Memory {
    constructor() {
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        this.implicationIndex = new Map();
        this.beliefIndex = new Map();
        this.costIndex = new Map();
        this.cycleCounter = 0;
        this.maintenanceFrequency = config.memory.MAINTENANCE_CYCLE_FREQUENCY;
        this._cachedAllTasks = null;

        this._loadForgettingStrategy();
        this._registerEventListeners();
    }

    _loadForgettingStrategy() {
        const strategyName = config.memory.FORGETTING_STRATEGY_NAME;
        try {
            const StrategyClass = require(`./strategies/${strategyName}ForgettingStrategy`);
            this.forgettingStrategy = new StrategyClass();
        } catch (error) {
            const DefaultStrategy = require('./strategies/TimeBasedForgettingStrategy');
            this.forgettingStrategy = new DefaultStrategy();
        }
    }

    _registerEventListeners() {
        EventBus.on('NewTasksCreated', (tasks) => this.addTasks(tasks));
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
        const result = consolidateMemory(this.shortTermTasks, this.longTermTasks, config);
        this.shortTermTasks = result.shortTermTasks;
        this.longTermTasks = result.longTermTasks;
        this._invalidateTaskCache();
    }

    _pruneMemory() {
        if (!this.forgettingStrategy) return;

        const options = config.memory.FORGETTING_STRATEGY_OPTIONS || {};
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

    _indexTask(task) {
        this.beliefIndex = indexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'add');
    }

    _unindexTask(task) {
        this.beliefIndex = unindexTask(task, this.beliefIndex);
        this.costIndex = updateCostIndex(task.term, this.costIndex, 'remove');
    }

    addTasks(tasks) {
        const tasksToAdd = normalizeToArray(tasks);
        if (tasksToAdd.length === 0) return;

        for (const task of tasksToAdd) {
            if (!task || !(task instanceof Task)) {
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

    getHighestPriorityTasks(k = 20) {
        if (k <= 0) return [];
        
        const allTasks = this.getAllTasks();
        const usePQ = k < 50 && k < allTasks.length / 10;

        if (usePQ) {
            return getHighestPriorityTasksWithPQ(allTasks, k);
        } else {
            return [...allTasks].sort((a, b) => b.state.priority - a.state.priority).slice(0, k);
        }
    }

    clone() {
        const newMemory = new Memory();
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        newMemory.beliefIndex = new Map(Array.from(this.beliefIndex.entries()).map(([key, value]) => [key, [...value]]));
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.forgettingStrategy = this.forgettingStrategy;
        newMemory.cycleCounter = this.cycleCounter;
        newMemory.maintenanceFrequency = this.maintenanceFrequency;
        return newMemory;
    }
    
    clear() {
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.implicationIndex.clear();
        this.beliefIndex.clear();
        this.costIndex.clear();
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
            costs: this.costIndex.size,
        };
    }

    getBeliefs() {
        return this.queryTasks({ punctuation: '.' });
    }

    getGoals() {
        return this.queryTasks({ punctuation: '!' });
    }

    getQuestions() {
        return this.queryTasks({ punctuation: '?' });
    }

    getRecentTasks(count = 10) {
        return [...this.getAllTasks()]
            .sort((a, b) => Number(b.state.stamp.creationTime) - Number(a.state.stamp.creationTime))
            .slice(0, count);
    }

    queryTasks(filters = {}) {
        let tasks = this.getAllTasks();

        if (filters.termKey) {
            tasks = tasks.filter(task => task.termKey === filters.termKey);
        }
        if (filters.punctuation) {
            tasks = tasks.filter(task => task.punctuation === filters.punctuation);
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
}

module.exports = Memory;
