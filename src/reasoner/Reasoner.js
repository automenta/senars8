const BruteForceStrategy = require('./strategies/BruteForceStrategy');
const rules = require('./rules');
const Task = require('../core/Task');
const { parseTerm } = require('../parser/narseseParser');

class Reasoner {
    constructor(strategy = new BruteForceStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
    }

    performInference(focusSet) {
        const processedCombinations = new Set();
        const derivedTasks = [];

        const arity2Combinations = Array.from(this.strategy.selectPairs(focusSet));
        for (const tasks of arity2Combinations) {
            for (const rule of this.rules) {
                if (rule.arity === 2) {
                    const derived = this._applyRule(rule, tasks, processedCombinations);
                    if (derived) {
                        derivedTasks.push(derived);
                    }
                }
            }
        }

        const arity3Combinations = Array.from(this.strategy.selectTriplets(focusSet));
        for (const tasks of arity3Combinations) {
            for (const rule of this.rules) {
                if (rule.arity === 3) {
                    const derived = this._applyRule(rule, tasks, processedCombinations);
                    if (derived) {
                        derivedTasks.push(derived);
                    }
                }
            }
        }

        return derivedTasks;
    }

    _applyRule(rule, tasks, processedCombinations) {
        // Use a rule-specific key to allow different rules to be applied to the same combination
        const combinationKey = rule.name + ':' + tasks.map(t => t.id).sort().join(',');
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
