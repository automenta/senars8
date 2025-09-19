import BasePlanner from './BasePlanner.js';

class HTNPlanner extends BasePlanner {
    constructor(memory, lm, configManager) {
        const config = configManager.get('planner');
        super(memory, lm, config);
        this.configManager = configManager;
        this.config.maxDepth = config.maxDepth || 10;
    }

    async findPlan(goalTask) {
        const goalTerm = this.memory.getTerm(goalTask.termKey);
        if (!goalTerm) return null;
        return this._findPlanRecursive(goalTerm, 0);
    }

    _findPlanRecursive(goal, depth) {
        if (depth > this.config.maxDepth) return null;
        if (this._isAchieved(goal)) return [];
        if (this._isPrimitive(goal)) return [goal];

        const methods = this._getDecompositionMethods(goal);
        if (!methods.length) return null;

        for (const method of methods) {
            const subTasks = this._getSubTasks(method.predicate);
            if (!subTasks) continue;

            const plan = this._solveSubTasks(subTasks, depth);
            if (plan) return plan;
        }

        return null;
    }

    _solveSubTasks(subTasks, depth) {
        let plan = [];
        for (const subTask of subTasks) {
            const subTaskTerm = this.memory.getTerm(subTask.key);
            const subPlan = this._findPlanRecursive(subTaskTerm, depth + 1);
            if (subPlan) {
                plan = plan.concat(subPlan);
            } else {
                return null;
            }
        }
        return plan;
    }
}

export default HTNPlanner;
