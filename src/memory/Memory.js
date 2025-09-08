const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');
const config = require('../config');

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

        this._loadForgettingStrategy();

        EventBus.on('NewTasksCreated', (tasks) => this.addTasks(tasks));
        EventBus.on('SystemCycleEnded', () => this._handleSystemCycleEnded());
    }

    _loadForgettingStrategy() {
        const strategyName = config.memory.FORGETTING_STRATEGY_NAME;
        try {
            const StrategyClass = require(`./strategies/${strategyName}ForgettingStrategy`);
            this.forgettingStrategy = new StrategyClass();
        } catch (e) {
            console.error(`Could not load forgetting strategy: ${strategyName}`, e);
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

    addTerm(term) {
        if (!(term instanceof Term)) throw new Error('Can only add Term instances to memory.');
        if (this.terms.has(term.key)) return;
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
        return this.terms.get(key);
    }

    addTasks(tasks) {
        const tasksToAdd = Array.isArray(tasks) ? tasks : [tasks];
        for (const task of tasksToAdd) {
            if (!(task instanceof Task)) throw new Error('Can only add Task instances to memory.');
            // New tasks are always added to short-term memory
            this.shortTermTasks.set(task.id, task);

            if (task.punctuation === '.') {
                this.beliefIndex.set(task.termKey, task);
                this._updateCostIndex(task.term, 'add');
            }
        }
    }

    getTask(id) {
        return this.shortTermTasks.get(id) || this.longTermTasks.get(id);
    }

    removeTask(taskId) {
        const task = this.shortTermTasks.get(taskId) || this.longTermTasks.get(taskId);
        if (task) {
            this.shortTermTasks.delete(taskId);
            this.longTermTasks.delete(taskId);
            if (task.punctuation === '.') {
                this.beliefIndex.delete(task.termKey);
                this._updateCostIndex(task.term, 'remove');
            }
        }
    }

    _updateCostIndex(term, operation) {
        if (term?.type === 'Inheritance' && term.subject && term.predicate?.type === 'IntensionalSet' && term.predicate.terms.length === 1) {
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
        return [...this.shortTermTasks.values(), ...this.longTermTasks.values()];
    }

    getHighestPriorityTasks(k = 20) {
        const allTasks = this.getAllTasks();
        allTasks.sort((a, b) => b.state.priority - a.state.priority);
        return allTasks.slice(0, k);
    }

    clone() {
        const newMemory = new Memory();
        newMemory.terms = new Map(this.terms);
        newMemory.shortTermTasks = new Map(this.shortTermTasks);
        newMemory.longTermTasks = new Map(this.longTermTasks);
        newMemory.implicationIndex = new Map(this.implicationIndex);
        newMemory.beliefIndex = new Map(this.beliefIndex);
        newMemory.costIndex = new Map(this.costIndex);
        newMemory.forgettingStrategy = this.forgettingStrategy; // shallow copy of strategy
        return newMemory;
    }
}

module.exports = Memory;
