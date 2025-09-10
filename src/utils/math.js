function cosineSimilarity(vecA, vecB) {
    // Early exit conditions
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Single pass calculation for better performance
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    // Calculate norms
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    // Avoid division by zero
    const divisor = normA * normB;
    return divisor === 0 ? 0 : dotProduct / divisor;
}

export {cosineSimilarity};
