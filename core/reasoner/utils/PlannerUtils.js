import {
    SystemCommands
} from '../../system/SystemCommands.js';

async function findDecompositionMethods(goalTerm, commandBus) {
    return await commandBus.request(SystemCommands.MEMORY_GET_IMPLICATIONS, goalTerm.key) || [];
}

function extractSubTasksFromMethod(methodTerm) {
    if (!methodTerm) return null;
    return methodTerm.type === 'SequentialConjunction' ? methodTerm.terms : [methodTerm];
}

async function isAchieved(term, commandBus, confidenceThreshold) {
    if (!term) return false;
    const beliefs = await commandBus.request(SystemCommands.MEMORY_QUERY_TASKS, {
        termKey: term.key,
        punctuation: '.',
        minConfidence: confidenceThreshold
    });
    return beliefs && beliefs.length > 0;
}

async function arePreconditionsMet(preconditions, commandBus, preconditionConfidenceThreshold) {
    if (!preconditions?.length) return true;
    for (const precondition of preconditions) {
        const beliefs = await commandBus.request(SystemCommands.MEMORY_QUERY_TASKS, {
            termKey: precondition.key,
            punctuation: '.',
            minConfidence: preconditionConfidenceThreshold,
            limit: 1
        });
        if (!beliefs || beliefs.length === 0) {
            return false;
        }
    }
    return true;
}

export {
    findDecompositionMethods,
    extractSubTasksFromMethod,
    isAchieved,
    arePreconditionsMet,
};
