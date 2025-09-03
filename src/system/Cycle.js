const Memory = require('../memory/Memory');
const Reasoner = require('../reasoner/Reasoner');
const LM = require('../lm/LM');

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
    }

    calculatePriority(task, currentTime) {
        const C = task.state.truthValue.confidence;

        const term = this.memory.getTerm(task.termKey);
        const E = term ? 1 / term.complexity : 1;

        const timeSinceCreation = currentTime - task.state.stamp.creationTime;
        const U_recency = 1 / (Math.max(1, timeSinceCreation / 1000)); // urgency decays over seconds

        return C * E * U_recency;
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
