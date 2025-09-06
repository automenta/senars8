const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');
const Task = require('../core/Task');
const { parseTerm } = require('../parser/narseseParser');

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

        return this.rules.flatMap(rule => {
            const combinations = taskCombinations.get(rule.arity);
            if (!combinations) return [];

            return [...combinations]
                .map(tasks => this._applyRule(rule, tasks, processedCombinations))
                .filter(Boolean);
        });
    }

    _applyRule(rule, tasks, processedCombinations) {
        const combinationKey = tasks.map(t => t.id).sort().join(',');
        if (processedCombinations.has(combinationKey)) return null;
        processedCombinations.add(combinationKey);

        const parsedTasks = tasks.map(task => parseTerm(task.termKey));
        if (parsedTasks.some(p => !p)) return null;

        if (this._areOperandsValid(rule, tasks) && rule.condition(...parsedTasks)) {
            const result = rule.action(...parsedTasks, ...tasks);
            if (!result) return null;

            const { newTermKey, newTruthValue } = result;
            const newTerm = parseTerm(newTermKey);
            if (!newTerm) return null;

            return new Task(newTerm, '.', newTruthValue);
        }
        return null;
    }

    _areOperandsValid(rule, tasks) {
        return tasks.every((task, i) => rule.operands[i](task));
    }
}

module.exports = Reasoner;
