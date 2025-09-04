const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');

class Reasoner {
    constructor(strategy = new BagSamplingStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
    }

    performInference(focusSet) {
        const derivedTasks = [];
        const processedCombinations = new Set();

        const taskCombinations = new Map([
            [2, this.strategy.selectPairs(focusSet)],
            [3, this.strategy.selectTriplets(focusSet)],
        ]);

        for (const rule of this.rules) {
            const combinations = taskCombinations.get(rule.arity);
            if (!combinations) continue;

            for (const tasks of combinations) {
                const combinationKey = tasks.map(t => t.id).sort().join(',');
                if (processedCombinations.has(combinationKey)) continue;
                processedCombinations.add(combinationKey);

                if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
                    const derivedTask = rule.action(...tasks);
                    if (derivedTask) {
                        derivedTasks.push(derivedTask);
                    }
                }
            }
        }

        return derivedTasks;
    }

    _areOperandsValid(rule, tasks) {
        for (let i = 0; i < rule.arity; i++) {
            if (!rule.operands[i](tasks[i])) {
                return false;
            }
        }
        return true;
    }
}

module.exports = Reasoner;
