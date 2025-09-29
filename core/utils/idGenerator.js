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

/**
 * Generates a unique ID.
 * If content is provided, it generates a hash-based ID.
 * Otherwise, it generates a simple sequential ID.
 * @param {string} [content] - Optional content to base the ID on.
 * @returns {string} The generated ID.
 */
function generateId(content) {
    if (content && content.length > 0) {
        return `${generateHashId(content)}-${generateSequentialId()}`;
    }
    return `id-${generateSequentialId()}`;
}

export { generateId };