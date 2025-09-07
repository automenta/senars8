const BasePlanner = require('./BasePlanner');

class HTNPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
    }

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

        const [currentTask, ...remainingTasks] = tasksToDo;

        if (this._isAchieved(currentTask)) {
            return this._findPlanRecursive(remainingTasks, planSoFar, depth, maxDepth);
        }

        const expansions = this._getExpansions(currentTask);

        // If a task has no valid expansions, this path fails.
        if (expansions.length === 0) {
            return null;
        }

        for (const expansion of expansions) {
            // A null method indicates a primitive action.
            if (expansion.method === null && expansion.subTasks.length > 0) {
                const newPlan = [...planSoFar, ...expansion.subTasks.map(t => t.key)];
                const result = await this._findPlanRecursive(remainingTasks, newPlan, depth + 1, maxDepth);
                if (result !== null) return result;
            } else { // Decomposed into sub-tasks
                const newTasksToDo = [...expansion.subTasks, ...remainingTasks];
                const result = await this._findPlanRecursive(newTasksToDo, planSoFar, depth + 1, maxDepth);
                if (result !== null) return result;
            }
        }

        return null;
    }
}

module.exports = HTNPlanner;
