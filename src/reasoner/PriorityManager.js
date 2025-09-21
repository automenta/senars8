import createConfigAccessor from '../config/ConfigAccessor.js';
import {cosineSimilarity} from '../utils/math.js';
import {calculateTemporalPriority} from '../utils/temporal.js';

class PriorityManager {
    constructor(memory, configManager) {
        this.memory = memory;
        this.config = createConfigAccessor(configManager);
    }

    calculatePriority(task, currentTime, driveEmbeddings) {
        const term = this.memory.getTerm(task.termKey);
        if (!term?.embedding?.length) return 0;

        const maxSimilarity = driveEmbeddings.reduce((max, driveEmbedding) =>
            Math.max(max, cosineSimilarity(term.embedding, driveEmbedding)), 0);

        const config = this.config.getAll();
        const I = (maxSimilarity + config.SIMILARITY_OFFSET) / config.SIMILARITY_SCALE;
        const U = 1 / (1 + (currentTime - Number(task.state.stamp.creationTime)) / config.RECENCY_DECAY_FACTOR);
        const T = calculateTemporalPriority(task, currentTime);
        const C = task.state.truthValue.confidence;
        const E = 1 / term.complexity;

        return I * U * T * C * E;
    }

    updatePriority(task) {
        // Ensure the task has a state object
        if (!task.state) {
            task.state = {};
        }

        // For now, we'll use a simple heuristic based on task type and term content
        // In a real implementation, we would calculate this based on embeddings and similarity to drives

        // Goals ('!') should generally have higher priority than beliefs ('.')
        let basePriority = task.punctuation === '!' ? 0.7 : 0.3;

        // Tasks related to constitutional concepts should have higher priority
        const constitutionalTerms = ['AcquireKnowledge', 'ReduceUncertainty', 'MaintainCoherence', 'MaintainCognitiveIntegrity'];
        if (constitutionalTerms.some(term => task.termKey.includes(term))) {
            basePriority += 0.2; // Boost for constitutional relevance
        }

        // Cap the priority at 1.0
        task.state.priority = Math.min(1.0, basePriority);
    }
}

export default PriorityManager;
