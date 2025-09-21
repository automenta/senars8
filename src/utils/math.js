/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} Cosine similarity value between -1 and 1
 */
const cosineSimilarity = (vec1, vec2) => {
    if (!vec1?.length || !vec2?.length || vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
    }

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
};

/**
 * Compare two embedding arrays for equality
 * @param {number[]} embedding1 - First embedding array
 * @param {number[]} embedding2 - Second embedding array
 * @param {number} tolerance - Tolerance for floating point comparison (default: 1e-6)
 * @returns {boolean} True if embeddings are equal within tolerance
 */
const embeddingsEqual = (embedding1, embedding2, tolerance = 1e-6) => {
    if (embedding1.length !== embedding2.length) return false;

    for (let i = 0; i < embedding1.length; i++) {
        if (Math.abs(embedding1[i] - embedding2[i]) >= tolerance) return false;
    }

    return true;
};

export {
    cosineSimilarity,
    embeddingsEqual
};
