const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');
const TemporalReasoner = require('./TemporalReasoner');

class Reasoner {
    constructor(strategy = new BagSamplingStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
        this.temporalReasoner = new TemporalReasoner();
    }

    performInference(focusSet) {
        const derivedTasks = [];

        // --- Symbolic Inference ---
        const processedCombinations = new Set();
        for (const rule of this.rules) {
            // Skip rules with no arity defined or arity < 1
            if (!rule.arity || rule.arity < 1) continue;

            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            for (const tasks of combinations) {
                if (tasks.length !== rule.arity) continue;

                const derived = this._applyRule(rule, tasks, processedCombinations);
                if (derived) {
                    derivedTasks.push(derived);
                }
            }
        }

        // --- Temporal Inference ---
        // The temporal reasoner performs a global analysis on the focus set
        const temporalTasks = this.temporalReasoner.infer(focusSet);
        derivedTasks.push(...temporalTasks);

        return derivedTasks;
    }

    _applyRule(rule, tasks, processedCombinations) {
        // Use a rule-specific key to allow different rules to be applied to the same combination
        const combinationKey = rule.name + ':' + tasks.map(t => t.id).sort().join(',');
        if (processedCombinations.has(combinationKey)) return null;
        processedCombinations.add(combinationKey);

        if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
            // The rule action returns a plain object that the Memory component will convert into a Task
            return rule.action(...tasks);
        }
        return null;
    }

    _areOperandsValid(rule, tasks) {
        // Ensure the number of tasks matches the rule's operand definitions
        if (tasks.length !== rule.operands.length) return false;
        return tasks.every((task, i) => rule.operands[i](task));
    }
}

module.exports = Reasoner;
