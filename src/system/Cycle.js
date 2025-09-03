const Memory = require('../memory/Memory');
const reasoner = require('../reasoner/Reasoner');
const { calculateImportance } = require('./Priority');

class Cycle {
    constructor(memory) {
        if (!(memory instanceof Memory)) {
            throw new Error('Cycle requires a Memory instance.');
        }
        this.memory = memory;
    }

    calculatePriority(task, currentTime) {
        // I (Importance)
        const I = calculateImportance(task, this.memory);

        // C (Confidence)
        const C = task.state.truthValue.confidence;

        // E (Effort)
        const term = this.memory.getTerm(task.termKey);
        const E = term ? 1 / term.complexity : 1;

        // U (Urgency)
        const timeSinceCreation = currentTime - task.state.stamp.creationTime;
        const U = 1 / (Math.max(1, timeSinceCreation / 1000)); // urgency decays over seconds

        return I * C * E * U;
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
        const derivedTasks = reasoner.performInference(focusSet, this.memory);
        this.memory.addTasks(derivedTasks);

        // 4. Meta-Cognition (Placeholder)
        const metaTasks = [];

        // 5. Semantic Enrichment & Action
        const tasksForEnrichment = [...derivedTasks, ...metaTasks];
        for (const task of tasksForEnrichment) {
            if (!this.memory.getTerm(task.termKey)) {
                // The LM is now encapsulated in memory
                const newTerm = await this.memory.lm.bootstrapTerm(task.termKey);
                this.memory.addTerm(newTerm);
            }
        }

        // Action System (Placeholder)
    }
}

module.exports = Cycle;
