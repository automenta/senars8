const Term = require('../core/Term');
const Task = require('../core/Task');

class Memory {
    constructor() {
        this.terms = new Map();
        this.tasks = new Map();
    }

    addTerm(term) {
        if (!(term instanceof Term)) {
            throw new Error('Can only add Term instances to memory.');
        }
        if (this.terms.has(term.key)) {
            return;
        }
        this.terms.set(term.key, term);
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
        }
    }

    getTask(id) {
        return this.tasks.get(id);
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
