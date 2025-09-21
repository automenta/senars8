let currentId = 0;

/**
 * Generates a simple sequential ID.
 * @returns {number} The next sequential ID.
 */
export function generateSequentialId() {
    return ++currentId;
}

/**
 * Generates a hash-based ID from a string content.
 * Uses a simple hashing algorithm for speed.
 * @param {string} content - The content to hash.
 * @returns {string} A base-36 encoded hash string.
 */
export function generateHashId(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Generates an optimized ID that combines a hash and a sequential number
 * to ensure uniqueness while keeping it short.
 * @param {string} content - The content to base the ID on.
 * @returns {string} The optimized unique ID.
 */
export function generateOptimizedId(content) {
    if (content && content.length > 0) {
        return `${generateHashId(content)}-${generateSequentialId()}`;
    }
    return `id-${generateSequentialId()}`;
}

/**
 * Generates a specific ID for an action.
 * @param {string} actionName - The name of the action.
 * @returns {string} The action ID.
 */
export function generateActionId(actionName) {
    return generateOptimizedId(`action-${actionName}`);
}

/**
 * Generates a specific ID for a plan.
 * @param {string} goalKey - The key of the goal this plan is for.
 * @returns {string} The plan ID.
 */
export function generatePlanId(goalKey) {
    return generateOptimizedId(`plan-${goalKey}`);
}
