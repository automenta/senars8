import BasePlanner from './BasePlanner.js';
import globalConfig from '../config/index.js';

class HTNPlanner extends BasePlanner {
    constructor(memory, lm, config = {}) {
        super(memory, lm, config);
        this.config.maxDepth = this.config.maxDepth || globalConfig.HTN_MAX_DEPTH || 10;
    }

    async findPlan(goalTask) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;
        return this._decompose(goalTerm, 0);
    }

    _decompose(task, depth) {
        if (depth > this.config.maxDepth) return null;
        if (this._isAchieved(task)) return [];
        if (this._isPrimitive(task)) return [task];

        const methods = this._getDecompositionMethods(task);
        if (!methods.length) return null;

        for (const method of methods) {
            const subTasks = this._getSubTasks(method.predicate);
            if (!subTasks) continue;

            const plan = this._constructPlanForSubtasks(subTasks, depth);
            if (plan !== null) return plan;
        }

        return null;
    }

    _constructPlanForSubtasks(subTasks, depth) {
        const plan = [];
        for (const subTask of subTasks) {
            const subTaskTerm = this.memory.getTerm(subTask.key);
            if (!subTaskTerm) return null; // Subtask term not found

            const subPlan = this._decompose(subTaskTerm, depth + 1);
            if (subPlan === null) return null; // Failed to find a plan for a subtask

            plan.push(...subPlan);
        }
        return plan;
    }
}

export default HTNPlanner;
