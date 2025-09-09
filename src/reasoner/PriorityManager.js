const {cosineSimilarity} = require('../utils/math');
const {calculateTemporalPriority} = require('../utils/temporal/priority');
const config = require('../config');

class PriorityManager {
    constructor(memory) {
        this.memory = memory;
    }

    calculatePriority(task, currentTime, driveEmbeddings) {
        const term = this.memory.getTerm(task.termKey);
        if (!term?.embedding?.length) return 0;

        const maxSimilarity = driveEmbeddings.reduce((max, driveEmbedding) => {
            const similarity = cosineSimilarity(term.embedding, driveEmbedding);
            return Math.max(max, similarity);
        }, 0);

        const I = (maxSimilarity + config.SIMILARITY_OFFSET) / config.SIMILARITY_SCALE;
        const U = 1 / (1 + (currentTime - Number(task.state.stamp.creationTime)) / config.RECENCY_DECAY_FACTOR);
        const T = calculateTemporalPriority(task, currentTime);
        const C = task.state.truthValue.confidence;
        const E = 1 / term.complexity;

        return I * U * T * C * E;
    }
}

module.exports = PriorityManager;
