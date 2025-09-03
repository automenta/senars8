const Task = require('../core/Task');
const Term = require('../core/Term');
const {AdvancedReasoner, induceTruthValue, abduceTruthValue, analogizeTruthValue} = require('./AdvancedReasoner');
const BruteForceStrategy = require('./strategies/BruteForceStrategy');
const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');

/**
 * Derives a new truth value from two premise truth values.
 * @param {object} tv1 - Truth value of the first premise.
 * @param {object} tv2 - Truth value of the second premise.
 * @returns {object} The derived truth value.
 */
function deduceTruthValue(tv1, tv2) {
    const frequency = tv1.frequency * tv2.frequency;
    const confidence = tv1.confidence * tv2.confidence * 0.9; // Deduction is strong but not infallible
    return {frequency, confidence};
}

class Reasoner {
    constructor(strategy = new BagSamplingStrategy()) {
        this.advancedReasoner = new AdvancedReasoner();
        this.strategy = strategy;
    }

    /**
     * Performs one step of inference on the focus set.
     * @param {Task[]} focusSet - A list of high-priority tasks.
     * @param {Map<string, Term>} termHypergraph - The term hypergraph.
     * @returns {Task[]} A list of newly derived tasks.
     */
    performInference(focusSet, termHypergraph) {
        // Ensure all tasks have their term representation parsed and cached
        for (const task of focusSet) {
            task.parseNow();
        }

        const derivedTasks = [];
        const processedPairs = new Set();

        // Handle 2-premise and 3-premise rules in a more structured way
        for (const [task1, task2] of this.strategy.selectPairs(focusSet)) {
            const pairKey = [task1.id, task2.id].sort().join(',');
            if (processedPairs.has(pairKey)) continue;
            processedPairs.add(pairKey);

            // Basic 2-premise inference
            const detachmentResult = this.modusPonens(task1, task2);
            if (detachmentResult) derivedTasks.push(detachmentResult);

            const inheritanceResult = this.inheritance(task1, task2);
            if (inheritanceResult) derivedTasks.push(inheritanceResult);

            // Advanced 2-premise inference
            const inductionResult = this.advancedReasoner.induction(task1, task2);
            if (inductionResult) derivedTasks.push(inductionResult);

            const abductionResult = this.advancedReasoner.abduction(task1, task2);
            if (abductionResult) derivedTasks.push(abductionResult);
        }

        // Handle 3-premise rules (analogy)
        for (const [task1, task2, task3] of this.strategy.selectTriplets(focusSet)) {
            const analogyResult = this.advancedReasoner.analogy(task1, task2, task3);
            if (analogyResult) derivedTasks.push(analogyResult);
        }

        return derivedTasks;
    }

    /**
     * Modus Ponens (Detachment): (A ==> B), A. |- B.
     * @param {Task} task1 - An implication task.
     * @param {Task} task2 - A belief task.
     * @returns {Task | null} The derived task or null.
     */
    modusPonens(task1, task2) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;

        if (parsed1?.type === 'Implication' && parsed2?.type === 'Atomic') {
            // The subject of the implication must match the atomic term's key.
            // Note: The parser should ensure parsed1.subject is an Atomic term.
            if (parsed1.subject.key === parsed2.key) {
                const newTermKey = Term.build(parsed1.predicate);
                const newTruthValue = deduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                return new Task(newTermKey, '.', newTruthValue);
            }
        }
        return null;
    }

    /**
     * Inheritance Chaining: (A --> B), (B --> C) |- (A --> C)
     * @param {Task} task1 - An inheritance task.
     * @param {Task} task2 - Another inheritance task.
     * @returns {Task | null} The derived task or null.
     */
    inheritance(task1, task2) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance') {
            // Chaining condition: predicate of the first term must match the subject of the second.
            // We compare their string keys for simplicity.
            if (Term.build(parsed1.predicate) === Term.build(parsed2.subject)) {
                const newTermKey = Term.build({
                    type: 'Inheritance',
                    subject: parsed1.subject,
                    predicate: parsed2.predicate
                });
                const newTruthValue = deduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                return new Task(newTermKey, '.', newTruthValue);
            }
        }
        return null;
    }
}

module.exports = Reasoner;
