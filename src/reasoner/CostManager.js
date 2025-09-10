class CostManager {
    constructor(memory, config = {}) {
        this.memory = memory;
        this.defaultCost = config.defaultCost || 1;
    }

    getTaskDifficulty(taskTerm) {
        const methods = this.memory.implicationIndex.get(taskTerm.key) || [];
        if (methods.length === 0) {
            return this.getActionCost(taskTerm);
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

    getActionCost(actionTerm) {
        if (this.memory.costIndex.has(actionTerm.key)) {
            return this.memory.costIndex.get(actionTerm.key);
        }
        return this.defaultCost;
    }

    getPlanCost(plan) {
        return plan.reduce((totalCost, action) => totalCost + this.getActionCost(action), 0);
    }
}

export default CostManager;
