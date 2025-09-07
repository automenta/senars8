const Term = require('../core/Term');
const Task = require('../core/Task');
const EventBus = require('../system/EventBus');

class Memory {
    constructor() {
        this.terms = new Map();
        this.tasks = new Map();
        this.implicationIndex = new Map(); // Index for HTN planning
        this.beliefIndex = new Map(); // Index for fast belief lookup
        EventBus.on('NewTasksCreated', (tasks) => this.addTasks(tasks));
    }

    addTerm(term) {
        if (!(term instanceof Term)) {
            throw new Error('Can only add Term instances to memory.');
        }
        if (this.terms.has(term.key)) {
            return;
        }
        this.terms.set(term.key, term);

        // For efficient planning, index implications by their goal
        if (term.type === 'Implication' && term.subject) {
            let goalTerm;
            if (term.subject.type === 'SequentialConjunction' && term.subject.terms.length > 0) {
                goalTerm = term.subject.terms[0]; // The goal is the first term in the conjunction
            } else {
                goalTerm = term.subject; // The subject itself is the goal
            }

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
            if (!(task instanceof Task)) {
                throw new Error('Can only add Task instances to memory.');
            }
            this.tasks.set(task.id, task);

            // If the task is a belief, add it to the belief index
            if (task.punctuation === '.') {
                this.beliefIndex.set(task.termKey, task);
            }
        }
    }

    getTask(id) {
        return this.tasks.get(id);
    }

    removeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            this.tasks.delete(taskId);
            // If the task was a belief, remove it from the belief index as well
            if (task.punctuation === '.') {
                this.beliefIndex.delete(task.termKey);
            }
        }
    }

    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    getHighestPriorityTasks(k = 20) {
        const allTasks = this.getAllTasks();
        allTasks.sort((a, b) => b.state.priority - a.state.priority);
        return allTasks.slice(0, k);
    }
}

module.exports = Memory;
