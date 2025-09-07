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
        const allImplications = Array.from(this.memory.terms.values())
            .filter(term => term.type === 'Implication');

        const matchingMethods = allImplications.filter(term => {
            const subject = term.subject;
            if (!subject) return false;

            // Case 1: Simple implication, e.g., <goal> ==> <method>
            if (subject.equals(goalTerm)) {
                return true;
            }

            // Case 2: Implication with preconditions, e.g., ((&, <goal>, <precond1>, ...)) ==> <method>
            if (subject.type === 'SequentialConjunction' && subject.terms.length > 0) {
                const goalInSubject = subject.terms[0];
                return goalInSubject.equals(goalTerm);
            }

            return false;
        });

        return matchingMethods; // Return the full implication term
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
        const allBeliefs = this.memory.getAllTasks()
            .filter(task => task.punctuation === '.' && task.state.truthValue.confidence > confidenceThreshold);

        const beliefMap = new Map(allBeliefs.map(task => [task.termKey, task]));

        for (const precondition of preconditions) {
            if (!beliefMap.has(precondition.key)) {
                return false; // A precondition is not met
            }
        }
        return true;
    }
}

module.exports = HTNPlanner;
