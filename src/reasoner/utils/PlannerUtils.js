function findDecompositionMethods(goalTerm, memory) {
    return memory.implicationIndex.get(goalTerm.key) || [];
}

function extractSubTasksFromMethod(methodTerm) {
    if (!methodTerm) { return null; }
    if (methodTerm.type === 'SequentialConjunction') {
        return methodTerm.terms;
    }
    return [methodTerm];
}

function isAchieved(term, memory, config) {
    const beliefs = memory.beliefIndex.get(term.key);
    return Boolean(beliefs && beliefs.length > 0 &&
        beliefs.some(belief => belief.state.truthValue.confidence >= config.confidenceThreshold));
}

function arePreconditionsMet(preconditions, memory, config) {
    for (const precondition of preconditions) {
        const beliefs = memory.beliefIndex.get(precondition.key);
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
