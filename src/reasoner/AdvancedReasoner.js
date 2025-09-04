const Task = require('../core/Task');
const Term = require('../core/Term');
const {buildTermKey} = require('../utils/term-builder');
const {parseTerm} = require('../parser/NewParser');

function induceTruthValue(tv1, tv2) {
    const frequency = (tv1.frequency + tv2.frequency) / 2;
    const confidence = tv1.confidence * tv2.confidence * 0.5;
    return {frequency, confidence};
}

function abduceTruthValue(tv1, tv2) {
    const frequency = (tv1.frequency + tv2.frequency) / 2;
    const confidence = tv1.confidence * tv2.confidence * 0.3;
    return {frequency, confidence};
}

function analogizeTruthValue(tv1, tv2, tv3) {
    const frequency = (tv1.frequency + tv2.frequency + tv3.frequency) / 3;
    const confidence = tv1.confidence * tv2.confidence * tv3.confidence * 0.4;
    return {frequency, confidence};
}

class AdvancedReasoner {
    _generateInheritanceHypothesis(task1, task2, type) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance') {
            if (buildTermKey(parsed1.predicate) === buildTermKey(parsed2.predicate) && buildTermKey(parsed1.subject) !== buildTermKey(parsed2.subject)) {
                let subject, predicate;
                let newTruthValue;

                if (type === 'induction') {
                    subject = parsed1.subject;
                    predicate = parsed2.subject;
                    newTruthValue = induceTruthValue(task1.state.truthValue, task2.state.truthValue);
                } else {
                    subject = parsed2.subject;
                    predicate = parsed1.subject;
                    newTruthValue = abduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                }

                const newTermKey = buildTermKey({type: 'Inheritance', subject, predicate});
                return new Task(parseTerm(newTermKey), '.', newTruthValue);
            }
        }
        return null;
    }

    induction(task1, task2) {
        return this._generateInheritanceHypothesis(task1, task2, 'induction');
    }

    abduction(task1, task2) {
        return this._generateInheritanceHypothesis(task1, task2, 'abduction');
    }

    analogy(task1, task2, task3) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.' || task3.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;
        const parsed3 = task3.term;

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance' && parsed3?.type === 'Inheritance') {
            if (buildTermKey(parsed1.subject) === buildTermKey(parsed3.subject) && buildTermKey(parsed2.subject) === buildTermKey(parsed3.predicate)) {
                const newTermKey = buildTermKey({
                    type: 'Inheritance',
                    subject: parsed1.predicate,
                    predicate: parsed2.predicate
                });
                const newTruthValue = analogizeTruthValue(
                    task1.state.truthValue,
                    task2.state.truthValue,
                    task3.state.truthValue
                );
                return new Task(parseTerm(newTermKey), '.', newTruthValue);
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