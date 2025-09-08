const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');
const TemporalReasoner = require('./TemporalReasoner');
const {info, error, debug} = require('../utils/logger');
const {handleErrorWithDefault} = require('../utils/error-handler');

class Reasoner {
    /**
     * Create a new Reasoner instance
     * @param {object} strategy - The strategy to use for selecting task combinations
     */
    constructor(strategy = new BagSamplingStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
        this.temporalReasoner = new TemporalReasoner();
        info('Reasoner initialized with strategy:', strategy.constructor.name);
    }

    /**
     * Perform inference on a focus set of tasks
     * @param {Task[]} focusSet - The set of tasks to perform inference on
     * @returns {Task[]} Array of derived tasks
     */
    performInference(focusSet) {
        debug(`Performing inference on ${focusSet.length} tasks`);
        const derivedTasks = [];

        // --- Symbolic Inference ---
        // Track processed combinations to avoid duplicate rule applications
        const processedCombinations = new Set();
        
        // Apply each rule to combinations of tasks from the focus set
        for (const rule of this.rules) {
            // Skip rules with no arity defined or arity < 1
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity`);
                continue;
            }

            try {
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
            } catch (err) {
                error(`Error applying rule ${rule.name}:`, err);
                // Continue with other rules even if one fails
            }
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);

        // --- Temporal Inference ---
        // The temporal reasoner performs a global analysis on the focus set
        try {
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            derivedTasks.push(...temporalTasks);
            debug(`Temporal inference produced ${temporalTasks.length} derived tasks`);
        } catch (err) {
            error('Error in temporal inference:', err);
            // Continue even if temporal inference fails
        }

        debug(`Total inference produced ${derivedTasks.length} derived tasks`);
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
        try {
            // Use a rule-specific key to allow different rules to be applied to the same combination
            const combinationKey = rule.name + ':' + tasks.map(task => task.id).sort().join(',');
            if (processedCombinations.has(combinationKey)) {
                return null;
            }
            processedCombinations.add(combinationKey);

            // Check if operands are valid and rule condition is met
            if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
                // The rule action returns a plain object that the Memory component will convert into a Task
                const result = rule.action(...tasks);
                if (result) {
                    debug(`Rule ${rule.name} applied successfully`);
                }
                return result;
            }
            return null;
        } catch (err) {
            error(`Error applying rule ${rule.name}:`, err);
            return handleErrorWithDefault(err, `Rule application error for ${rule.name}`, null);
        }
    }

    /**
     * Check if operands are valid for a rule
     * @private
     * @param {object} rule - The rule to validate
     * @param {Task[]} tasks - The tasks to validate
     * @returns {boolean} True if operands are valid, false otherwise
     */
    _areOperandsValid(rule, tasks) {
        try {
            // Ensure the number of tasks matches the rule's operand definitions
            if (tasks.length !== rule.operands.length) return false;
            return tasks.every((task, index) => {
                try {
                    return rule.operands[index](task);
                } catch (err) {
                    error(`Error validating operand for rule ${rule.name}:`, err);
                    return false;
                }
            });
        } catch (err) {
            error(`Error validating operands for rule ${rule.name}:`, err);
            return false;
        }
    }
}

module.exports = Reasoner;
