const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');
const config = require('../config');
const {isBelief} = require('../utils/task-utils');

class Memory {
    constructor() {
        // Core data structures
        this.terms = new Map();
        this.shortTermTasks = new Map();
        this.longTermTasks = new Map();
        
        // Indexes for efficient lookups
        this.implicationIndex = new Map();
        this.beliefIndex = new Map();
        this.costIndex = new Map();

        // Maintenance settings
        this.cycleCounter = 0;
        this.maintenanceFrequency = config.memory.MAINTENANCE_CYCLE_FREQUENCY;

        // Load forgetting strategy
        this._loadForgettingStrategy();

        // Event listeners
        EventBus.on('NewTasksCreated', (tasks) => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._handleSystemCycleEnded());
    }

    // Strategy management
    _loadForgettingStrategy() {
        const strategyName = config.memory.FORGETTING_STRATEGY_NAME;
        try {
            const StrategyClass = require(`./strategies/${strategyName}ForgettingStrategy`);
            this.forgettingStrategy = new StrategyClass();
        } catch (e) {
            console.warn(`Could not load forgetting strategy: ${strategyName}`, e);
            const DefaultStrategy = require('./strategies/TimeBasedForgettingStrategy');
            this.forgettingStrategy = new DefaultStrategy();
        }
    }

    // Maintenance methods
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

        for (const [id, task] of this.shortTermTasks.entries()) {
            const isHighPriority = task.state.priority >= priorityThreshold;
            const isHighConfidence = task.state.truthValue.confidence >= confidenceThreshold;

            if (isHighPriority || isHighConfidence) {
                this.longTermTasks.set(id, task);
                this.shortTermTasks.delete(id);
            }
        }
    }

    _pruneMemory() {
        if (this.forgettingStrategy) {
            const options = config.memory.FORGETTING_STRATEGY_OPTIONS || {};
            this.shortTermTasks = this.forgettingStrategy.prune(this.shortTermTasks, options.shortTerm);
            this.longTermTasks = this.forgettingStrategy.prune(this.longTermTasks, options.longTerm);
        }
    }

    // Term management
    addTerm(term) {
        if (!term) {
            throw new Error('Term cannot be null or undefined');
        }
        
        if (!(term instanceof Term)) {
            throw new Error('Can only add Term instances to memory.');
        }
        
        if (this.terms.has(term.key)) {
            return; // Term already exists
        }
        
        this.terms.set(term.key, term);

        // Update implication index for implications
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

    // Task management
    addTasks(tasks) {
        if (!tasks) {
            return;
        }
        
        const tasksToAdd = Array.isArray(tasks) ? tasks : [tasks];
        
        for (const task of tasksToAdd) {
            if (!task) {
                continue;
            }
            
            if (!(task instanceof Task)) {
                throw new Error('Can only add Task instances to memory.');
            }
            
            // New tasks are always added to short-term memory
            this.shortTermTasks.set(task.id, task);

            // Update indexes for beliefs
            if (isBelief(task)) {
                this.beliefIndex.set(task.termKey, task);
                this._updateCostIndex(task.term, 'add');
            }
        }
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
            
            if (isBelief(task)) {
                this.beliefIndex.delete(task.termKey);
                this._updateCostIndex(task.term, 'remove');
            }
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

    // Query methods
    getAllTasks() {
        // Use concat instead of spread for better performance with large datasets
        const allTasks = [];
        for (const task of this.shortTermTasks.values()) {
            allTasks.push(task);
        }
        for (const task of this.longTermTasks.values()) {
            allTasks.push(task);
        }
        return allTasks;
    }

    getHighestPriorityTasks(k = 20) {
        if (k <= 0) {
            return [];
        }
        
        // For small k, we can optimize by not sorting the entire collection
        if (k < 10) {
            const allTasks = this.getAllTasks();
            // Use a more efficient partial sort for small k
            return allTasks
                .sort((a, b) => b.state.priority - a.state.priority)
                .slice(0, k);
        } else {
            // For larger k, sort all tasks
            const allTasks = this.getAllTasks();
            allTasks.sort((a, b) => b.state.priority - a.state.priority);
            return allTasks.slice(0, k);
        }
    }

    // Utility methods
    clone() {
        const newMemory = new Memory();
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        newMemory.beliefIndex = new Map(this.beliefIndex);
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.forgettingStrategy = this.forgettingStrategy; // shallow copy of strategy
        newMemory.cycleCounter = this.cycleCounter;
        newMemory.maintenanceFrequency = this.maintenanceFrequency;
        return newMemory;
    }
    
    // Cleanup method
    clear() {
        this.terms.clear();
        this.shortTermTasks.clear();
        this.longTermTasks.clear();
        this.implicationIndex.clear();
        this.beliefIndex.clear();
        this.costIndex.clear();
        this.cycleCounter = 0;
    }
    
    // Statistics methods
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
}

module.exports = Memory;
