const Task = require('../core/Task');
const Term = require('../core/Term');

/**
 * Derives a new truth value for induction.
 * @param {object} tv1 - Truth value of the first premise.
 * @param {object} tv2 - Truth value of the second premise.
 * @returns {object} The derived truth value.
 */
function induceTruthValue(tv1, tv2) {
    // Induction is less certain than deduction
    const frequency = (tv1.frequency + tv2.frequency) / 2;
    const confidence = tv1.confidence * tv2.confidence * 0.5; // Lower confidence for induction
    return {frequency, confidence};
}

/**
 * Derives a new truth value for abduction.
 * @param {object} tv1 - Truth value of the first premise.
 * @param {object} tv2 - Truth value of the second premise.
 * @returns {object} The derived truth value.
 */
function abduceTruthValue(tv1, tv2) {
    // Abduction is even less certain
    const frequency = (tv1.frequency + tv2.frequency) / 2;
    const confidence = tv1.confidence * tv2.confidence * 0.3; // Lower confidence for abduction
    return {frequency, confidence};
}

/**
 * Derives a new truth value for analogy.
 * @param {object} tv1 - Truth value of the first premise.
 * @param {object} tv2 - Truth value of the second premise.
 * @param {object} tv3 - Truth value of the third premise.
 * @returns {object} The derived truth value.
 */
function analogizeTruthValue(tv1, tv2, tv3) {
    // Analogy combines three truth values
    const frequency = (tv1.frequency + tv2.frequency + tv3.frequency) / 3;
    const confidence = tv1.confidence * tv2.confidence * tv3.confidence * 0.4; // Moderate confidence for analogy
    return {frequency, confidence};
}

class AdvancedReasoner {
    /**
     * Generates a new inheritance hypothesis through induction or abduction.
     * @private
     */
    _generateInheritanceHypothesis(task1, task2, type) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance') {
            if (Term.build(parsed1.predicate) === Term.build(parsed2.predicate) && Term.build(parsed1.subject) !== Term.build(parsed2.subject)) {
                let subject, predicate;
                let newTruthValue;

                if (type === 'induction') {
                    subject = parsed1.subject;
                    predicate = parsed2.subject;
                    newTruthValue = induceTruthValue(task1.state.truthValue, task2.state.truthValue);
                } else { // abduction
                    subject = parsed2.subject;
                    predicate = parsed1.subject;
                    newTruthValue = abduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                }

                const newTermKey = Term.build({type: 'Inheritance', subject, predicate});
                return new Task(newTermKey, '.', newTruthValue);
            }
        }
        return null;
    }

    /**
     * Performs induction: (A --> B), (C --> B) |- (A --> C)
     */
    induction(task1, task2) {
        return this._generateInheritanceHypothesis(task1, task2, 'induction');
    }

    /**
     * Performs abduction: (A --> B), (C --> B) |- (C --> A)
     */
    abduction(task1, task2) {
        return this._generateInheritanceHypothesis(task1, task2, 'abduction');
    }

    /**
     * Performs analogy: (A --> B), (C --> D), (A --> C) |- (B --> D)
     * @param {Task} task1 - An inheritance task.
     * @param {Task} task2 - Another inheritance task.
     * @param {Task} task3 - Another inheritance task.
     * @returns {Task | null} The derived task or null.
     */
    analogy(task1, task2, task3) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.' || task3.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;
        const parsed3 = task3.term;

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance' && parsed3?.type === 'Inheritance') {
            // Check if we have the pattern for analogy: (A --> B), (C --> D), (A --> C) |- (B --> D)
            if (Term.build(parsed1.subject) === Term.build(parsed3.subject) && Term.build(parsed2.subject) === Term.build(parsed3.predicate)) {
                const newTermKey = Term.build({
                    type: 'Inheritance',
                    subject: parsed1.predicate,
                    predicate: parsed2.predicate
                });
                const newTruthValue = analogizeTruthValue(
                    task1.state.truthValue,
                    task2.state.truthValue,
                    task3.state.truthValue
                );
                return new Task(newTermKey, '.', newTruthValue);
            }
        }
        return null;
    }
}

module.exports = {
    AdvancedReasoner,
    induceTruthValue,
    abduceTruthValue,
    analogizeTruthValue
};