import createConfigAccessor from '../config/ConfigAccessor.js';
import {cosineSimilarity} from '../utils/math.js';
import {calculateTemporalPriority} from '../utils/temporal.js';

class PriorityManager {
    constructor(memory, configManager) {
        this.memory = memory;
        this.config = createConfigAccessor(configManager);
    }

    calculatePriority(task, currentTime, driveEmbeddings) {
        // Ensure task has required properties
        if (!task.termKey) return 0;

        const term = this.memory.getTerm(task.termKey);
        if (!term?.embedding?.length) return 0;

        // Optimize the similarity calculation with early termination
        let maxSimilarity = 0;
        for (let i = 0; i < driveEmbeddings.length; i++) {
            const similarity = cosineSimilarity(term.embedding, driveEmbeddings[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                // Early termination optimization if we reach maximum possible similarity
                if (similarity >= 0.999) break;
            }
        }

        const config = this.config.getAll();
        const I = (maxSimilarity + config.SIMILARITY_OFFSET) / config.SIMILARITY_SCALE;
        const U = 1 / (1 + (currentTime - Number(task.state.stamp.creationTime)) / config.RECENCY_DECAY_FACTOR);
        const T = calculateTemporalPriority(task, currentTime);
        const C = task.state.truthValue?.confidence || 0;
        const E = term.complexity ? 1 / term.complexity : 0;

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
        let basePriority = (task.punctuation === '!' || (task.punctuation && task.punctuation === '!')) ? 0.7 : 0.3;

        // Tasks related to constitutional concepts should have higher priority
        const constitutionalTerms = ['AcquireKnowledge', 'ReduceUncertainty', 'MaintainCoherence', 'MaintainCognitiveIntegrity'];
        if (task.termKey && typeof task.termKey === 'string' && constitutionalTerms.some(term => task.termKey.includes(term))) {
            basePriority += 0.2; // Boost for constitutional relevance
        }

        // Cap the priority at 1.0
        task.state.priority = Math.min(1.0, basePriority);
    }
}

export default PriorityManager;
