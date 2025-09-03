// Mock implementation of the transformers pipeline

const pipeline = async (task, model) => {
    // Return a function that mimics the feature-extraction pipeline
    const extractor = (text, options) => {
        // Return a dummy output that has the expected structure
        return {
            data: new Float32Array(384).fill(0.1), // Mock embedding vector
            dims: [1, 384],
        };
    };
    return extractor;
};

module.exports = {
    pipeline,
};
