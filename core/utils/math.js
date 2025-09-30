const cosineSimilarity = (vec1, vec2) => {
    if (!vec1?.length || !vec2?.length || vec1.length !== vec2.length) {
        return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        magnitude1 += vec1[i] * vec1[i];
        magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

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
