const cosineSimilarity = (vec1, vec2) => {
    if (!vec1?.length || !vec2?.length || vec1.length !== vec2.length) {
        return 0;
    }

    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
};

const embeddingsEqual = (embedding1, embedding2, tolerance = 1e-6) => {
    if (embedding1.length !== embedding2.length) {
        return false;
    }

    return embedding1.every((val, i) => Math.abs(val - embedding2[i]) < tolerance);
};

export {
    cosineSimilarity,
    embeddingsEqual
};