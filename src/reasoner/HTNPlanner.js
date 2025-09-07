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

        const implications = this._findDecompositionMethods(currentTask);

        // If no decomposition methods found, the task is considered primitive
        if (implications.length === 0) {
            const newPlan = [...planSoFar, currentTask];
            return this._findPlanRecursive(remainingTasks, newPlan, depth + 1, maxDepth);
        }

        // Task is compound, try each valid method (implication)
        for (const implication of implications) {
            const subject = implication.subject;
            let preconditions = [];

            if (subject.type === 'SequentialConjunction') {
                preconditions = subject.terms.slice(1);
            }

            if (this._arePreconditionsMet(preconditions)) {
                const method = implication.predicate;
                const subTasks = this._extractSubTasksFromMethod(method);
                if (subTasks) {
                    const newTasksToDo = [...subTasks, ...remainingTasks];
                    const result = await this._findPlanRecursive(newTasksToDo, planSoFar, depth + 1, maxDepth);
                    if (result !== null) {
                        return result; // Found a valid plan
                    }
                }
            }
        }

        return null; // No valid plan found from this path
    }

    _findDecompositionMethods(goalTerm) {
        // Efficiently find matching decomposition methods using the implication index
        return this.memory.implicationIndex.get(goalTerm.key) || [];
    }

    _extractSubTasksFromMethod(methodTerm) {
        if (!methodTerm) return null;

        if (methodTerm.type === 'SequentialConjunction') {
            return methodTerm.terms; // Already an array of Term instances
        }

        // Method is a single task
        return [methodTerm];
    }

    _arePreconditionsMet(preconditions, confidenceThreshold = 0.8) {
        for (const precondition of preconditions) {
            const belief = this.memory.beliefIndex.get(precondition.key);

            // Check if the belief exists and meets the confidence threshold
            if (!belief || belief.state.truthValue.confidence <= confidenceThreshold) {
                return false; // A precondition is not met
            }
        }
        return true;
    }
}

module.exports = HTNPlanner;
