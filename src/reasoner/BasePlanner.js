class BasePlanner {
    constructor(memory, config = {}) {
        this.memory = memory;
        this.defaultCost = config.defaultCost || 1;
        this.confidenceThreshold = config.confidenceThreshold || 0.9;
        this.preconditionConfidenceThreshold = config.preconditionConfidenceThreshold || 0.8;
    }

    _findDecompositionMethods(goalTerm) {
        return this.memory.implicationIndex.get(goalTerm.key) || [];
    }

    _extractSubTasksFromMethod(methodTerm) {
        if (!methodTerm) return null;
        if (methodTerm.type === 'SequentialConjunction') {
            return methodTerm.terms;
        }
        return [methodTerm];
    }

    _isAchieved(term) {
        const belief = this.memory.beliefIndex.get(term.key);
        return belief && belief.state.truthValue.confidence >= this.confidenceThreshold;
    }

    _arePreconditionsMet(preconditions) {
        for (const precondition of preconditions) {
            const belief = this.memory.beliefIndex.get(precondition.key);
            if (!belief || belief.state.truthValue.confidence <= this.preconditionConfidenceThreshold) {
                return false;
            }
        }
        return true;
    }

    /**
     * Estimates the difficulty of achieving a task.
     * A simple heuristic: the number of decomposition methods.
     * More methods might mean an easier task.
     * @param {Term} taskTerm The term representing the task.
     * @returns {number} An estimation of the task's difficulty.
     */
    getTaskDifficulty(taskTerm) {
        const methods = this._findDecompositionMethods(taskTerm);
        if (methods.length === 0) {
            return this.defaultCost; // Primitive action
        }
        // A rough heuristic: more methods might mean it's easier to find a plan.
        return 1 / (1 + methods.length);
    }

    /**
     * Calculates the cost of a single action.
     * Looks for a belief like `<action --> [costValue]>`.
     * @param {Term} actionTerm The term representing the action.
     * @returns {number} The cost of the action.
     */
    getActionCost(actionTerm) {
        for (const belief of this.memory.beliefIndex.values()) {
            const term = this.memory.getTerm(belief.termKey);
            if (term && term.type === 'Inheritance' && term.subject.equals(actionTerm)) {
                if (term.predicate.type === 'IntensionalSet' && term.predicate.terms.length === 1) {
                    const cost = parseFloat(term.predicate.terms[0].key);
                    if (!isNaN(cost)) {
                        return cost;
                    }
                }
            }
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

module.exports = BasePlanner;
