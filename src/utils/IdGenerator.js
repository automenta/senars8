/**
 * Optimized ID generator for memory-efficient ID creation
 *
 * This module provides efficient ID generation strategies to replace
 * UUID generation for better performance and memory usage.
 */

let currentId = 0;

/**
 * Generates a sequential numeric ID
 * @returns {number} Sequential numeric ID
 */
function generateSequentialId() {
    return ++currentId;
}

/**
 * Generates a hash-based ID from content
 * @param {string} content - Content to hash
 * @returns {string} Hash-based ID
 */
function generateHashId(content) {
    if (typeof content !== 'string') {
        throw new Error('Content must be a string');
    }

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Generates an optimized ID using a hybrid approach
 * @param {string} [content] - Optional content to base ID on
 * @returns {string} Optimized ID
 */
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