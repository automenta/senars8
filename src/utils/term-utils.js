const {cosineSimilarity} = require('./math');

/**
 * Calculates the structural similarity between two terms based on their keys.
 * @param {string} termKey1 - The first term key.
 * @param {string} termKey2 - The second term key.
 * @returns {number} A similarity score between 0 and 1.
 */
function structuralSimilarity(termKey1, termKey2) {
    if (termKey1 === termKey2) return 1.0;

    // Simple approach: count common substrings
    const commonSubstrings = [];
    const minLength = Math.min(termKey1.length, termKey2.length);

    // Check for common substrings of length 2 or more
    for (let len = 2; len <= minLength; len++) {
        for (let i = 0; i <= termKey1.length - len; i++) {
            const substring = termKey1.substring(i, i + len);
            if (termKey2.includes(substring)) {
                commonSubstrings.push(substring);
            }
        }
    }

    // Calculate similarity based on common substrings
    const totalLength = termKey1.length + termKey2.length;
    const commonLength = commonSubstrings.reduce((sum, substr) => sum + substr.length, 0);

    return totalLength > 0 ? (2 * commonLength) / totalLength : 0;
}

/**
 * Finds semantically similar terms in a memory instance.
 * @param {Map<string, Term>} terms - The terms map from memory.
 * @param {string} targetTermKey - The key of the term to find similarities for.
 * @param {number} maxResults - Maximum number of results to return.
 * @returns {Array<{termKey: string, similarity: number}>} Similar terms with similarity scores.
 */
function findSimilarTerms(terms, targetTermKey, maxResults = 10) {
    const targetTerm = terms.get(targetTermKey);
    if (!targetTerm || !targetTerm.embedding) {
        return [];
    }

    const similarities = [];

    for (const [termKey, term] of terms) {
        if (termKey === targetTermKey) continue;
        if (!term.embedding) continue;

        // Calculate cosine similarity
        const semanticSimilarity = cosineSimilarity(targetTerm.embedding, term.embedding);

        // Calculate structural similarity
        const structSimilarity = structuralSimilarity(targetTermKey, termKey);

        // Combine both similarities (weighted average)
        const combinedSimilarity = 0.7 * semanticSimilarity + 0.3 * structSimilarity;

        similarities.push({
            termKey,
            similarity: combinedSimilarity
        });
    }

    // Sort by similarity and return top results
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, maxResults);
}

/**
 * Compares two terms for equality, considering both key and embedding.
 * @param {Term} term1 - The first term.
 * @param {Term} term2 - The second term.
 * @returns {boolean} True if terms are considered equal.
 */
function termsEqual(term1, term2) {
    if (term1.key !== term2.key) return false;
    if (term1.complexity !== term2.complexity) return false;

    // Compare embeddings (with small tolerance for floating point)
    if (term1.embedding.length !== term2.embedding.length) return false;

    for (let i = 0; i < term1.embedding.length; i++) {
        if (Math.abs(term1.embedding[i] - term2.embedding[i]) > 1e-6) {
            return false;
        }
    }

    return true;
}

module.exports = {
    structuralSimilarity,
    findSimilarTerms,
    termsEqual
};