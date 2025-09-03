const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');
const { cosineSimilarity } = require('../utils/math');
const CONSTITUTION_TASKS = require('./Constitution');

class Cycle {
    constructor(memory, reasoner, lm) {
        if (!(memory instanceof Memory)) {
            throw new Error('Cycle requires a Memory instance.');
        }
        if (!(reasoner instanceof Reasoner)) {
            throw new Error('Cycle requires a Reasoner instance.');
        }
        if (!(lm instanceof LM)) {
            throw new Error('Cycle requires an LM instance.');
        }
        this.memory = memory;
        this.reasoner = reasoner;
        this.lm = lm;

        // Pre-compute the embeddings for the constitutional drives for efficiency
        this.driveEmbeddings = CONSTITUTION_TASKS
            .filter(task => task.punctuation === '!')
            .map(task => this.memory.getTerm(task.termKey)?.embedding)
            .filter(Boolean); // Filter out any terms that might not have been bootstrapped
    }

    calculatePriority(task, currentTime) {
        const term = this.memory.getTerm(task.termKey);
        if (!term || !term.embedding || term.embedding.length === 0) {
            return 0; // Cannot calculate priority without an embedding
        }

        // I (Importance): Relevance to constitutional drives
        let maxSimilarity = 0;
        for (const driveEmbedding of this.driveEmbeddings) {
            const similarity = cosineSimilarity(term.embedding, driveEmbedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
        // The Importance score is boosted slightly to give it more weight
        const I = (maxSimilarity + 0.1) / 1.1;


        // U (Urgency): Based on recency
        const timeSinceCreation = currentTime - task.state.stamp.creationTime;
        const U = 1 / (1 + timeSinceCreation / 10000); // Decays over 10s

        // C (Confidence): From the task's truth value
        const C = task.state.truthValue.confidence;

        // E (Effort): Inverse of the term's complexity
        const E = 1 / term.complexity;

        // Final Priority Calculation
        return I * U * C * E;
    }

    async runOnce() {
        const currentTime = Date.now();

        // 1. Perception (Placeholder)
        const newTasks = [];
        this.memory.addTasks(newTasks);

        // 2. Prioritization
        for (const task of this.memory.getAllTasks()) {
            task.state.priority = this.calculatePriority(task, currentTime);
        }

        // 3. Inference
        const focusSet = this.memory.getHighestPriorityTasks(20);
        const derivedTasks = this.reasoner.performInference(focusSet, this.memory.terms);
        this.memory.addTasks(derivedTasks);

        // 4. Meta-Cognition (Placeholder)
        const metaTasks = [];

        // 5. Semantic Enrichment & Action
        const tasksForEnrichment = [...derivedTasks, ...metaTasks];
        for (const task of tasksForEnrichment) {
            if (!this.memory.getTerm(task.termKey)) {
                const newTerm = await this.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(newTerm);
            }
        }

        // Action System (Placeholder)
    }
}

module.exports = Cycle;
