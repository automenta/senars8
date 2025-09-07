class BasePlanner {
    constructor(memory) {
        this.memory = memory;
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

    _isAchieved(term, confidenceThreshold = 0.9) {
        const belief = this.memory.beliefIndex.get(term.key);
        return belief && belief.state.truthValue.confidence >= confidenceThreshold;
    }

    _arePreconditionsMet(preconditions, confidenceThreshold = 0.8) {
        for (const precondition of preconditions) {
            const belief = this.memory.beliefIndex.get(precondition.key);

            if (!belief || belief.state.truthValue.confidence <= confidenceThreshold) {
                return false;
            }
        }
        return true;
    }
}

module.exports = BasePlanner;
