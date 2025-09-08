const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');
const TemporalReasoner = require('./TemporalReasoner');

class Reasoner {
    /**
     * Create a new Reasoner instance
     * @param {object} strategy - The strategy to use for selecting task combinations
     */
    constructor(strategy = new BagSamplingStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
        this.temporalReasoner = new TemporalReasoner();
    }

    /**
     * Perform inference on a focus set of tasks
     * @param {Task[]} focusSet - The set of tasks to perform inference on
     * @returns {Task[]} Array of derived tasks
     */
    performInference(focusSet) {
        const derivedTasks = [];

        // --- Symbolic Inference ---
        // Track processed combinations to avoid duplicate rule applications
        const processedCombinations = new Set();
        
        // Apply each rule to combinations of tasks from the focus set
        for (const rule of this.rules) {
            // Skip rules with no arity defined or arity < 1
            if (!rule.arity || rule.arity < 1) continue;

            // Select combinations of tasks based on rule arity
            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            
            // Apply rule to each combination
            for (const tasks of combinations) {
                // Skip combinations that don't match rule arity
                if (tasks.length !== rule.arity) continue;

                // Apply rule and collect derived tasks
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

    /**
     * Apply a rule to a combination of tasks
     * @private
     * @param {object} rule - The rule to apply
     * @param {Task[]} tasks - The tasks to apply the rule to
     * @param {Set} processedCombinations - Set of already processed combinations
     * @returns {Task|null} Derived task or null if rule doesn't apply
     */
    _applyRule(rule, tasks, processedCombinations) {
        // Use a rule-specific key to allow different rules to be applied to the same combination
        const combinationKey = rule.name + ':' + tasks.map(task => task.id).sort().join(',');
        if (processedCombinations.has(combinationKey)) return null;
        processedCombinations.add(combinationKey);

        // Check if operands are valid and rule condition is met
        if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
            // The rule action returns a plain object that the Memory component will convert into a Task
            return rule.action(...tasks);
        }
        return null;
    }

    /**
     * Check if operands are valid for a rule
     * @private
     * @param {object} rule - The rule to validate
     * @param {Task[]} tasks - The tasks to validate
     * @returns {boolean} True if operands are valid, false otherwise
     */
    _areOperandsValid(rule, tasks) {
        // Ensure the number of tasks matches the rule's operand definitions
        if (tasks.length !== rule.operands.length) return false;
        return tasks.every((task, index) => rule.operands[index](task));
    }
}

module.exports = Reasoner;
