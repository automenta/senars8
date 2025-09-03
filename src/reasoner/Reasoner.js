const { parseTerm } = require('../parser/TermParser');
const Task = require('../core/Task');
const Term = require('../core/Term');

/**
 * Derives a new truth value from two premise truth values.
 * @param {object} tv1 - Truth value of the first premise.
 * @param {object} tv2 - Truth value of the second premise.
 * @returns {object} The derived truth value.
 */
function deduceTruthValue(tv1, tv2) {
    const frequency = tv1.frequency * tv2.frequency;
    const confidence = tv1.confidence * tv2.confidence * 0.9; // Deduction is strong but not infallible
    return { frequency, confidence };
}

class Reasoner {
    /**
     * Performs one step of inference on the focus set.
     * @param {Task[]} focusSet - A list of high-priority tasks.
     * @param {Map<string, Term>} termHypergraph - The term hypergraph.
     * @returns {Task[]} A list of newly derived tasks.
     */
    performInference(focusSet, termHypergraph) {
        const derivedTasks = [];

        for (let i = 0; i < focusSet.length; i++) {
            for (let j = 0; j < focusSet.length; j++) {
                if (i === j) continue;

                const task1 = focusSet[i];
                const task2 = focusSet[j];

                // Attempt different inference patterns
                const detachmentResult = this.modusPonens(task1, task2);
                if (detachmentResult) derivedTasks.push(detachmentResult);

                const inheritanceResult = this.inheritance(task1, task2);
                if (inheritanceResult) derivedTasks.push(inheritanceResult);
            }
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

        const parsed1 = parseTerm(task1.termKey);
        const parsed2 = parseTerm(task2.termKey);

        if (parsed1?.type === 'Implication' && parsed2?.type === 'Atomic') {
            if (parsed1.subject === parsed2.key) {
                const newTermKey = parsed1.predicate;
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

        const parsed1 = parseTerm(task1.termKey);
        const parsed2 = parseTerm(task2.termKey);

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance') {
            if (parsed1.predicate === parsed2.subject) {
                const newTermKey = `(${parsed1.subject} --> ${parsed2.predicate})`;
                const newTruthValue = deduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                return new Task(newTermKey, '.', newTruthValue);
            }
        }
        return null;
    }
}

module.exports = Reasoner;
