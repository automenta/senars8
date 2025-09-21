let currentId = 0;

function generateSequentialId() {
    return ++currentId;
}

function generateHashId(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

function generateOptimizedId(content) {
    if (content && content.length > 0) {
        return `${generateHashId(content)}-${generateSequentialId()}`;
    }
    return `id-${generateSequentialId()}`;
}

function generateActionId(actionName) {
    return generateOptimizedId(`action-${actionName}`);
}

function generatePlanId(goalKey) {
    return generateOptimizedId(`plan-${goalKey}`);
}

export {
    generateSequentialId,
    generateHashId,
    generateOptimizedId,
    generateActionId,
    generatePlanId
};