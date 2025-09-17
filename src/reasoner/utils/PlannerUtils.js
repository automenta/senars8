function findDecompositionMethods(goalTerm, memory) {
    return memory.indexer.implicationIndex.get(goalTerm.key) || [];
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
    if (!term) {
        return false;
    }
    const beliefs = memory.indexer.beliefIndex.get(term.key);
    return Boolean(beliefs && beliefs.length > 0 &&
        beliefs.some(belief => belief.state.truthValue.confidence >= config.confidenceThreshold));
}

function arePreconditionsMet(preconditions, memory, config) {
    if (!preconditions || preconditions.length === 0) {
        return true;
    }
    for (const precondition of preconditions) {
        const beliefs = memory.indexer.beliefIndex.get(precondition.key);
        if (!beliefs || beliefs.length === 0 ||
            !beliefs.some(belief => belief.state.truthValue.confidence > config.preconditionConfidenceThreshold)) {
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
