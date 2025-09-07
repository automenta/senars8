const BasePlanner = require('./BasePlanner');

class HTNPlanner extends BasePlanner {
    async findPlan(goalTask, maxDepth = 10) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

        const planOfTerms = await this._findPlanRecursive([goalTerm], [], 0, maxDepth);
        if (!planOfTerms) return null;

        return planOfTerms.map(term => this.memory.getTerm(term.key));
    }

    async _findPlanRecursive(tasksToDo, planSoFar, depth, maxDepth) {
        if (depth > maxDepth) return null;
        if (tasksToDo.length === 0) return planSoFar;

        const currentTask = tasksToDo[0];
        const remainingTasks = tasksToDo.slice(1);

        if (this._isAchieved(currentTask)) {
            return this._findPlanRecursive(remainingTasks, planSoFar, depth + 1, maxDepth);
        }

        const implications = this._findDecompositionMethods(currentTask);

        if (implications.length === 0) {
            const newPlan = [...planSoFar, currentTask];
            return this._findPlanRecursive(remainingTasks, newPlan, depth + 1, maxDepth);
        }

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
                        return result;
                    }
                }
            }
        }

        return null;
    }
}

module.exports = HTNPlanner;
