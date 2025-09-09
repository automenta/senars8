const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');
const config = require('../config');
const {normalizeToArray} = require('../utils/array-utils');
const {MinPriorityQueue} = require('@datastructures-js/priority-queue');

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
        const priorityThreshold = config.memory.CONSOLIDATION_PRIORITY_THRESHOLD;
        const confidenceThreshold = config.memory.CONSOLIDATION_CONFIDENCE_THRESHOLD;

        const tasksToMove = [];
        for (const [taskId, task] of this.shortTermTasks.entries()) {
            if (task.state.priority >= priorityThreshold || task.state.truthValue.confidence >= confidenceThreshold) {
                tasksToMove.push([taskId, task]);
            }
        }

        for (const [taskId, task] of tasksToMove) {
            this.longTermTasks.set(taskId, task);
            this.shortTermTasks.delete(taskId);
        }
        
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
        if (term.type !== 'Implication' || !term.subject) return;

        const goalTerm = (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0)
            ? term.subject.terms[0]
            : term.subject;
        const goalKey = goalTerm.key;

        if (!this.implicationIndex.has(goalKey)) {
            this.implicationIndex.set(goalKey, []);
        }
        this.implicationIndex.get(goalKey).push(term);
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
        if (!Task.isBelief(task)) return;

        if (!this.beliefIndex.has(task.termKey)) {
            this.beliefIndex.set(task.termKey, []);
        }
        this.beliefIndex.get(task.termKey).push(task);
        this._updateCostIndex(task.term, 'add');
    }

    _unindexTask(task) {
        if (!Task.isBelief(task) || !this.beliefIndex.has(task.termKey)) return;

        const beliefs = this.beliefIndex.get(task.termKey);
        const index = beliefs.indexOf(task);
        if (index !== -1) {
            beliefs.splice(index, 1);
            if (beliefs.length === 0) {
                this.beliefIndex.delete(task.termKey);
            }
        }
        this._updateCostIndex(task.term, 'remove');
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

    _updateCostIndex(term, operation) {
        if (!term || term.type !== 'Inheritance' || !term.subject || term.predicate?.type !== 'IntensionalSet' || term.predicate.terms.length !== 1) {
            return;
        }

        const cost = parseFloat(term.predicate.terms[0].key);
        if (isNaN(cost)) return;

        const actionKey = term.subject.key;
        if (operation === 'add') {
            this.costIndex.set(actionKey, cost);
        } else {
            this.costIndex.delete(actionKey);
        }
    }

    getAllTasks() {
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [...this.shortTermTasks.values(), ...this.longTermTasks.values()];
        }
        return this._cachedAllTasks;
    }

    _getHighestPriorityTasksWithPQ(tasks, k) {
        const pq = new MinPriorityQueue({ priority: (task) => task.state.priority });
        for (const task of tasks) {
            if (pq.size() < k) {
                pq.enqueue(task);
            } else if (task.state.priority > pq.front().priority) {
                pq.dequeue();
                pq.enqueue(task);
            }
        }
        return pq.toArray().map(item => item.element).sort((a, b) => b.state.priority - a.state.priority);
    }

    getHighestPriorityTasks(k = 20) {
        if (k <= 0) return [];
        
        const allTasks = this.getAllTasks();
        const usePQ = k < 50 && k < allTasks.length / 10;

        if (usePQ) {
            return this._getHighestPriorityTasksWithPQ(allTasks, k);
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
