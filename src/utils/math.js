function cosineSimilarity(vecA, vecB) {
    // Early returns for common edge cases
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
    }

    // Use single loop for better performance
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i];
        const b = vecB[i];
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
    }

    // Early return for zero vectors
    if (normA === 0 || normB === 0) {
        return 0;
    }

    const divisor = Math.sqrt(normA) * Math.sqrt(normB);
    return divisor === 0 ? 0 : dotProduct / divisor;
}

export {
    cosineSimilarity
};
