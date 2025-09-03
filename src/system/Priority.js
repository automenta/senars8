function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    const divisor = Math.sqrt(normA) * Math.sqrt(normB);
    if (divisor === 0) {
        return 0;
    }

    return dotProduct / divisor;
}

function calculateImportance(task, memory) {
    const taskTerm = memory.getTerm(task.termKey);
    if (!taskTerm || !taskTerm.embedding || taskTerm.embedding.length === 0) {
        return 0.5; // Default importance for tasks without embeddings
    }

    let maxSimilarity = -1;

    for (const driveTask of memory.drives) {
        const driveTerm = memory.getTerm(driveTask.termKey);
        if (driveTerm && driveTerm.embedding && driveTerm.embedding.length > 0) {
            const similarity = cosineSimilarity(taskTerm.embedding, driveTerm.embedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
    }

    // The result of cosine similarity is [-1, 1], we need to map it to [0, 1] for priority calculation
    const normalizedSimilarity = (maxSimilarity + 1) / 2;

    return normalizedSimilarity;
}

module.exports = {
    cosineSimilarity,
    calculateImportance,
};
