class HTNPlanner {
    constructor(memory) {
        this.memory = memory;
    }

    async findPlan(goalTask, maxDepth = 10) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

        const planOfKeys = await this._findPlanRecursive([goalTerm], [], 0, maxDepth);
        if (!planOfKeys) return null;

        // Convert plan of terms back to a list of tasks
        return planOfKeys.map(term => this.memory.getTerm(term.key));
    }

    async _findPlanRecursive(tasksToDo, planSoFar, depth, maxDepth) {
        if (depth > maxDepth) return null;
        if (tasksToDo.length === 0) return planSoFar;

        const currentTask = tasksToDo[0];
        const remainingTasks = tasksToDo.slice(1);

        const methods = this._findDecompositionMethods(currentTask);

        if (methods.length === 0) { // Task is primitive
            const newPlan = [...planSoFar, currentTask];
            return this._findPlanRecursive(remainingTasks, newPlan, depth + 1, maxDepth);
        }

        // Task is compound, try each valid method
        for (const method of methods) {
            const subTasks = this._extractSubTasksFromMethod(method);
            if (subTasks) {
                const newTasksToDo = [...subTasks, ...remainingTasks];
                const result = await this._findPlanRecursive(newTasksToDo, planSoFar, depth + 1, maxDepth);
                if (result !== null) {
                    return result;
                }
            }
        }

        return null;
    }

    _findDecompositionMethods(goalTerm) {
        const allTerms = Array.from(this.memory.terms.values());

        return allTerms.filter(term =>
            term.type === 'Implication' &&
            term.subject &&
            term.subject.equals(goalTerm)
        ).map(term => term.predicate);
    }

    _extractSubTasksFromMethod(methodTerm) {
        if (!methodTerm) return null;

        if (methodTerm.type === 'SequentialConjunction') {
            return methodTerm.terms; // Already an array of Term instances
        }

        // Method is a single task
        return [methodTerm];
    }
}

module.exports = HTNPlanner;
