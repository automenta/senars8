const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');

class Reasoner {
    constructor(strategy = new BagSamplingStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
    }

    performInference(focusSet) {
        const processedCombinations = new Set();
        const taskCombinations = new Map([
            [2, this.strategy.selectPairs(focusSet)],
            [3, this.strategy.selectTriplets(focusSet)],
        ]);

        const derivedTasks = this.rules.flatMap(rule => {
            const combinations = taskCombinations.get(rule.arity) || [];
            const results = combinations
                .map(tasks => this._applyRule(rule, tasks, processedCombinations));

            // Explicitly convert to array if it's an iterator
            const filteredResults = Array.from(results).filter(Boolean);
            return filteredResults;
        });
        return derivedTasks;
    }

    _applyRule(rule, tasks, processedCombinations) {
        const combinationKey = tasks.map(t => t.id).sort().join(',');
        if (processedCombinations.has(combinationKey)) return null;
        processedCombinations.add(combinationKey);

        if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
            return rule.action(...tasks);
        }
        return null;
    }

    _areOperandsValid(rule, tasks) {
        return tasks.every((task, i) => rule.operands[i](task));
    }
}

module.exports = Reasoner;
