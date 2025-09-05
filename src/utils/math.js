function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
    }

    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    const divisor = normA * normB;

    return divisor === 0 ? 0 : dotProduct / divisor;
}

module.exports = {cosineSimilarity};
