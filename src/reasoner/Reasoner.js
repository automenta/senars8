const Task = require('../core/Task');
const Term = require('../core/Term');
const {buildTermKey} = require('../utils/term-builder');
const {parseTerm} = require('../parser/NewParser');
const {AdvancedReasoner, induceTruthValue, abduceTruthValue, analogizeTruthValue} = require('./AdvancedReasoner');
const BruteForceStrategy = require('./strategies/BruteForceStrategy');
const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');

function deduceTruthValue(tv1, tv2) {
    const frequency = tv1.frequency * tv2.frequency;
    const confidence = tv1.confidence * tv2.confidence * 0.9;
    return {frequency, confidence};
}

class Reasoner {
    constructor(strategy = new BagSamplingStrategy()) {
        this.advancedReasoner = new AdvancedReasoner();
        this.strategy = strategy;
    }

    performInference(focusSet, termHypergraph) {
        const derivedTasks = [];
        const processedPairs = new Set();

        for (const [task1, task2] of this.strategy.selectPairs(focusSet)) {
            const pairKey = [task1.id, task2.id].sort().join(',');
            if (processedPairs.has(pairKey)) continue;
            processedPairs.add(pairKey);

            const detachmentResult = this.modusPonens(task1, task2);
            if (detachmentResult) derivedTasks.push(detachmentResult);

            const inheritanceResult = this.inheritance(task1, task2);
            if (inheritanceResult) derivedTasks.push(inheritanceResult);

            const inductionResult = this.advancedReasoner.induction(task1, task2);
            if (inductionResult) derivedTasks.push(inductionResult);

            const abductionResult = this.advancedReasoner.abduction(task1, task2);
            if (abductionResult) derivedTasks.push(abductionResult);
        }

        for (const [task1, task2, task3] of this.strategy.selectTriplets(focusSet)) {
            const analogyResult = this.advancedReasoner.analogy(task1, task2, task3);
            if (analogyResult) derivedTasks.push(analogyResult);
        }

        return derivedTasks;
    }

    modusPonens(task1, task2) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;

        if (parsed1?.type === 'Implication' && parsed2?.type === 'Atomic') {
            if (parsed1.subject.key === parsed2.key) {
                const newTermKey = buildTermKey(parsed1.predicate);
                const newTruthValue = deduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                return new Task(parseTerm(newTermKey), '.', newTruthValue);
            }
        }
        return null;
    }

    inheritance(task1, task2) {
        if (task1.punctuation !== '.' || task2.punctuation !== '.') return null;

        const parsed1 = task1.term;
        const parsed2 = task2.term;

        if (parsed1?.type === 'Inheritance' && parsed2?.type === 'Inheritance') {
            if (buildTermKey(parsed1.predicate) === buildTermKey(parsed2.subject)) {
                const newTermKey = buildTermKey({
                    type: 'Inheritance',
                    subject: parsed1.subject,
                    predicate: parsed2.predicate
                });
                const newTruthValue = deduceTruthValue(task1.state.truthValue, task2.state.truthValue);
                return new Task(parseTerm(newTermKey), '.', newTruthValue);
            }
        }
        return null;
    }
}

module.exports = Reasoner;
