function findDecompositionMethods(goalTerm, memory) {
    return memory.implicationIndex.get(goalTerm.key) || [];
}

function extractSubTasksFromMethod(methodTerm) {
    if (!methodTerm) {
        return null;
    }
    if (methodTerm.type === 'SequentialConjunction') {
        return methodTerm.terms;
    }
    return [methodTerm];
}

function isAchieved(term, memory, config) {
    // If the term doesn't exist in memory, it cannot be achieved.
    if (!term) {
        return false;
    }
    const beliefs = memory.beliefIndex.get(term.key);
    if (!beliefs || beliefs.size === 0) {
        return false;
    }
    for (const belief of beliefs) {
        if (belief.state.truthValue.confidence >= config.confidenceThreshold) {
            return true;
        }
    }
    return false;
}

function arePreconditionsMet(preconditions, memory, config) {
    for (const precondition of preconditions) {
        const beliefs = memory.beliefIndex.get(precondition.key);
        if (!beliefs || beliefs.size === 0) {
            return false;
        }
        let preconditionMet = false;
        for (const belief of beliefs) {
            if (belief.state.truthValue.confidence > config.preconditionConfidenceThreshold) {
                preconditionMet = true;
                break;
            }
        }
        if (!preconditionMet) {
            return false;
        }
    }
    return true;
}

export {
    findDecompositionMethods,
    extractSubTasksFromMethod,
    isAchieved,
    arePreconditionsMet
};
