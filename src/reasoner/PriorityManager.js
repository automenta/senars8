import {
    cosineSimilarity
} from '../utils/math.js';
import {
    calculateTemporalPriority
} from '../utils/temporal.js';
import config from '../config/index.js';

class PriorityManager {
    constructor(memory) {
        this.memory = memory;
    }

    calculatePriority(task, currentTime, driveEmbeddings) {
        const term = this.memory.getTerm(task.termKey);
        if (!term?.embedding?.length) return 0;

        const maxSimilarity = driveEmbeddings.reduce((max, driveEmbedding) =>
            Math.max(max, cosineSimilarity(term.embedding, driveEmbedding)), 0);

        const I = (maxSimilarity + config.SIMILARITY_OFFSET) / config.SIMILARITY_SCALE;
        const U = 1 / (1 + (currentTime - Number(task.state.stamp.creationTime)) / config.RECENCY_DECAY_FACTOR);
        const T = calculateTemporalPriority(task, currentTime);
        const C = task.state.truthValue.confidence;
        const E = 1 / term.complexity;

        return I * U * T * C * E;
    }
}

export default PriorityManager;
