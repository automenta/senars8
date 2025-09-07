class CostManager {
    constructor(memory, config = {}) {
        this.memory = memory;
        this.defaultCost = config.defaultCost || 1;
    }

    /**
     * Estimates the difficulty of achieving a task.
     * A simple heuristic: the number of decomposition methods.
     * More methods might mean an easier task.
     * @param {Term} taskTerm The term representing the task.
     * @returns {number} An estimation of the task's difficulty.
     */
    getTaskDifficulty(taskTerm) {
        const methods = this.memory.implicationIndex.get(taskTerm.key) || [];
        if (methods.length === 0) {
            return this.getActionCost(taskTerm); // Primitive action
        }

        let minDifficulty = Infinity;

        for (const method of methods) {
            let methodDifficulty = 0;
            let preconditions = [];
            if (method.subject && method.subject.type === 'SequentialConjunction') {
                preconditions = method.subject.terms.slice(1);
            }

            for (const precondition of preconditions) {
                const belief = this.memory.beliefIndex.get(precondition.key);
                const confidence = belief ? belief.state.truthValue.confidence : 0;
                methodDifficulty += (1 - confidence);
            }

            if (methodDifficulty < minDifficulty) {
                minDifficulty = methodDifficulty;
            }
        }

        return minDifficulty;
    }

    /**
     * Calculates the cost of a single action.
     * Looks for a belief like `<action --> [costValue]>`.
     * @param {Term} actionTerm The term representing the action.
     * @returns {number} The cost of the action.
     */
    getActionCost(actionTerm) {
        if (this.memory.costIndex.has(actionTerm.key)) {
            return this.memory.costIndex.get(actionTerm.key);
        }
        return this.defaultCost;
    }

    /**
     * Calculates the total cost of a plan.
     * @param {Array<Term>} plan A sequence of action terms.
     * @returns {number} The total cost of the plan.
     */
    getPlanCost(plan) {
        return plan.reduce((totalCost, action) => totalCost + this.getActionCost(action), 0);
    }
}

module.exports = CostManager;
