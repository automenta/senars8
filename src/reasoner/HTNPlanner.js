const BasePlanner = require('./BasePlanner');
const PlannerUtils = require('./utils/PlannerUtils');

class HTNPlanner extends BasePlanner {
    async findPlan(goalTask, maxDepth = 10) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;

        const planOfKeys = await this._findPlanRecursive([goalTerm], [], 0, maxDepth);
        if (!planOfKeys) return null;

        return planOfKeys.map(key => this.memory.getTerm(key));
    }

    async _findPlanRecursive(tasksToDo, planSoFar, depth, maxDepth) {
        if (depth > maxDepth) return null;
        if (tasksToDo.length === 0) return planSoFar;

        const currentTask = tasksToDo[0];
        const remainingTasks = tasksToDo.slice(1);

        if (PlannerUtils.isAchieved(currentTask, this.memory, this.config)) {
            return this._findPlanRecursive(remainingTasks, planSoFar, depth + 1, maxDepth);
        }

        if (currentTask.type === 'SequentialConjunction') {
            const subTasks = PlannerUtils.extractSubTasksFromMethod(currentTask);
            const newTasksToDo = [...subTasks, ...remainingTasks];
            return this._findPlanRecursive(newTasksToDo, planSoFar, depth + 1, maxDepth);
        }

        const implications = PlannerUtils.findDecompositionMethods(currentTask, this.memory);

        if (implications.length === 0) {
            const newPlan = [...planSoFar, currentTask.key];
            return this._findPlanRecursive(remainingTasks, newPlan, depth + 1, maxDepth);
        }

        for (const implication of implications) {
            const subject = implication.subject;
            let preconditions = [];

            if (subject.type === 'SequentialConjunction') {
                preconditions = subject.terms.slice(1);
            }

            if (PlannerUtils.arePreconditionsMet(preconditions, this.memory, this.config)) {
                const method = implication.predicate;
                const subTasks = PlannerUtils.extractSubTasksFromMethod(method);
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
