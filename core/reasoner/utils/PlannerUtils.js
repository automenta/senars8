function findDecompositionMethods(goalTerm, memory) {
    return memory.indexer.implicationIndex.get(goalTerm.key) || [];
}

function extractSubTasksFromMethod(methodTerm) {
    if (!methodTerm) return null;
    return methodTerm.type === 'SequentialConjunction' ? methodTerm.terms : [methodTerm];
}

function isAchieved(term, memory, confidenceThreshold) {
    if (!term) return false;
    const beliefs = memory.indexer.beliefIndex.get(term.key);
    return !!beliefs?.some(belief => belief.state.truthValue.confidence >= confidenceThreshold);
}

function arePreconditionsMet(preconditions, memory, preconditionConfidenceThreshold) {
    if (!preconditions?.length) return true;
    return preconditions.every(precondition => {
        const beliefs = memory.indexer.beliefIndex.get(precondition.key);
        return beliefs?.some(belief => belief.state.truthValue.confidence > preconditionConfidenceThreshold);
    });
}

export {
    findDecompositionMethods,
    extractSubTasksFromMethod,
    isAchieved,
    arePreconditionsMet,
};
