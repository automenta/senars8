const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');
const config = require('../config');

class Memory {
    constructor() {
        // Core data structures for storing terms and tasks
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        
        // Indexes for efficient lookups of specific types of information
        this.implicationIndex = new Map();  // Index of implications by goal term
        this.beliefIndex = new Map();       // Index of beliefs by term key (maps termKey to array of tasks)
        this.costIndex = new Map();         // Index of action costs

        // Maintenance settings for memory management
        this.cycleCounter = 0;
        this.maintenanceFrequency = config.memory.MAINTENANCE_CYCLE_FREQUENCY;

        // Cached task list for performance
        this._cachedAllTasks = null;

        // Load forgetting strategy for memory pruning
        this._loadForgettingStrategy();

        // Register event listeners for automatic task management
        EventBus.on('NewTasksCreated', (tasks) => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._handleSystemCycleEnded());
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

    _handleSystemCycleEnded() {
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
            const isHighPriority = task.state.priority >= priorityThreshold;
            const isHighConfidence = task.state.truthValue.confidence >= confidenceThreshold;

            if (isHighPriority || isHighConfidence) {
                tasksToMove.push([taskId, task]);
            }
        }

        for (const [taskId, task] of tasksToMove) {
            this.longTermTasks.set(taskId, task);
            this.shortTermTasks.delete(taskId);
        }
        
        this._cachedAllTasks = null;
    }

    _pruneMemory() {
        if (this.forgettingStrategy) {
            const options = config.memory.FORGETTING_STRATEGY_OPTIONS || {};
            this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
            this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
            this._cachedAllTasks = null;
        }
    }

    addTerm(term) {
        if (!term) {
            throw new Error('Term cannot be null or undefined');
        }
        
        if (!(term instanceof Term)) {
            throw new Error('Can only add Term instances to memory.');
        }
        
        if (this.terms.has(term.key)) {
            return;
        }
        
        this.terms.set(term.key, term);

        if (term.type === 'Implication' && term.subject) {
            const goalTerm = (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0)
                ? term.subject.terms[0]
                : term.subject;
            const goalKey = goalTerm.key;
            
            if (!this.implicationIndex.has(goalKey)) {
                this.implicationIndex.set(goalKey, []);
            }
            this.implicationIndex.get(goalKey).push(term);
        }
    }

    getTerm(key) {
        if (!key) {
            return null;
        }
        return this.terms.get(key);
    }

    addTasks(tasks) {
        if (!tasks) {
            return;
        }
        
        const {normalizeToArray} = require('../utils/array-utils');
        const tasksToAdd = normalizeToArray(tasks);
        
        for (const task of tasksToAdd) {
            if (!task) {
                continue;
            }
            
            if (!(task instanceof Task)) {
                throw new Error('Can only add Task instances to memory.');
            }
            
            this.shortTermTasks.set(task.id, task);

            if (Task.isBelief(task)) {
                if (!this.beliefIndex.has(task.termKey)) {
                    this.beliefIndex.set(task.termKey, []);
                }
                this.beliefIndex.get(task.termKey).push(task);
                this._updateCostIndex(task.term, 'add');
            }
        }
        
        this._cachedAllTasks = null;
    }

    getTask(id) {
        if (!id) {
            return null;
        }
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    removeTask(taskId) {
        if (!taskId) {
            return;
        }
        
        const task = this.shortTermTasks.get(taskId) || this.longTermTasks.get(taskId);
        if (task) {
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            
            if (Task.isBelief(task)) {
                if (this.beliefIndex.has(task.termKey)) {
                    const beliefs = this.beliefIndex.get(task.termKey);
                    const index = beliefs.indexOf(task);
                    if (index !== -1) {
                        beliefs.splice(index, 1);
                        if (beliefs.length === 0) {
                            this.beliefIndex.delete(task.termKey);
                        }
                    }
                }
                this._updateCostIndex(task.term, 'remove');
            }
            
            this._cachedAllTasks = null;
        }
    }

    _updateCostIndex(term, operation) {
        if (!term) {
            return;
        }
        
        if (term.type === 'Inheritance' && 
            term.subject && 
            term.predicate?.type === 'IntensionalSet' && 
            term.predicate.terms.length === 1) {
            
            const cost = parseFloat(term.predicate.terms[0].key);
            if (!isNaN(cost)) {
                const actionKey = term.subject.key;
                if (operation === 'add') {
                    this.costIndex.set(actionKey, cost);
                } else {
                    this.costIndex.delete(actionKey);
                }
            }
        }
    }

    getAllTasks() {
        if (!this._cachedAllTasks) {
            this._cachedAllTasks = [
                ...this.shortTermTasks.values(),
                ...this.longTermTasks.values()
            ];
        }
        return this._cachedAllTasks;
    }

    getHighestPriorityTasks(k = 20) {
        if (k <= 0) {
            return [];
        }
        
        const allTasks = this.getAllTasks();
        
        if (k < 50 && k < allTasks.length / 10) {
            const {MinPriorityQueue} = require('@datastructures-js/priority-queue');
            const pq = new MinPriorityQueue({ priority: (task) => task.state.priority });
            
            for (const task of allTasks) {
                if (pq.size() < k) {
                    pq.enqueue(task);
                } else if (task.state.priority > pq.front().priority) {
                    pq.dequeue();
                    pq.enqueue(task);
                }
            }
            
            const result = [];
            while (!pq.isEmpty()) {
                result.unshift(pq.dequeue().element);
            }
            return result;
        } else {
            const sortedTasks = [...allTasks];
            sortedTasks.sort((a, b) => b.state.priority - a.state.priority);
            return sortedTasks.slice(0, k);
        }
    }

    clone() {
        const newMemory = new Memory();
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        
        for (const [termKey, tasks] of this.beliefIndex.entries()) {
            newMemory.beliefIndex.set(termKey, [...tasks]);
        }
        
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.forgettingStrategy = this.forgettingStrategy; // shallow copy of strategy
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
        this._cachedAllTasks = null;
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

    findTasksByTermKey(termKey) {
        if (this.beliefIndex.has(termKey)) {
            return this.beliefIndex.get(termKey);
        }
        
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.termKey === termKey);
    }

    findTasksByType(type) {
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.punctuation === type);
    }

    getHighPriorityTasks(threshold = 0.5) {
        const allTasks = this.getAllTasks();
        return allTasks.filter(task => task.state.priority >= threshold);
    }
}

module.exports = Memory;
