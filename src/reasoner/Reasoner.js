const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');
const TemporalReasoner = require('./TemporalReasoner');
const {info, debug} = require('../utils/logger');
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
     * @param {object} [options] - Additional options for inference
     * @param {number} [options.maxDerivedTasks] - Maximum number of derived tasks to generate
     * @returns {Task[]} Array of derived tasks
     */
    performInference(focusSet, options = {}) {
        // Validate input
        if (!Array.isArray(focusSet)) {
            handleErrorWithDefault(new Error('Focus set must be an array'), 'Reasoner.performInference', []);
            return [];
        }
        
        const { maxDerivedTasks = Infinity } = options;
        
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
            
            // Skip rule if we've already reached the maximum number of derived tasks
            if (derivedTasks.length >= maxDerivedTasks) {
                break;
            }

            try {
                // Select combinations of tasks based on rule arity
                const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
                
                // Apply rule to each combination
                for (const tasks of combinations) {
                    // Skip rule if we've already reached the maximum number of derived tasks
                    if (derivedTasks.length >= maxDerivedTasks) {
                        break;
                    }
                    
                    // Validate tasks array
                    if (!Array.isArray(tasks)) {
                        continue;
                    }
                    
                    // Skip combinations that don't match rule arity
                    if (tasks.length !== rule.arity) continue;

                    // Apply rule and collect derived tasks
                    const derived = this._applyRule(rule, tasks, processedCombinations);
                    if (derived) {
                        derivedTasks.push(derived);
                        
                        // Early termination if we've reached the maximum
                        if (derivedTasks.length >= maxDerivedTasks) {
                            break;
                        }
                    }
                }
            } catch (err) {
                handleErrorWithDefault(err, `Error applying rule ${rule.name}`, null);
                // Continue with other rules even if one fails
            }
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);

        // --- Temporal Inference ---
        // The temporal reasoner performs a global analysis on the focus set
        // Only run temporal inference if we haven't reached the maximum yet
        if (derivedTasks.length < maxDerivedTasks) {
            try {
                const temporalTasks = this.temporalReasoner.infer(focusSet);
                if (Array.isArray(temporalTasks)) {
                    // Add temporal tasks up to the limit
                    const remainingSlots = maxDerivedTasks - derivedTasks.length;
                    const tasksToAdd = temporalTasks.slice(0, remainingSlots);
                    derivedTasks.push(...tasksToAdd);
                    debug(`Temporal inference produced ${tasksToAdd.length} derived tasks`);
                }
            } catch (err) {
                handleErrorWithDefault(err, 'Error in temporal inference', null);
                // Continue even if temporal inference fails
            }
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
        // Validate inputs
        if (!rule || !Array.isArray(tasks) || !processedCombinations) {
            handleErrorWithDefault(new Error('Invalid arguments to _applyRule'), '_applyRule validation', null);
            return null;
        }
        
        // Use a rule-specific key to allow different rules to be applied to the same combination
        // Sort task IDs to ensure consistent key generation regardless of task order
        const taskIds = tasks.map(task => task.id).sort();
        const combinationKey = rule.name + ':' + taskIds.join(',');
        
        // Check if this combination has already been processed
        if (processedCombinations.has(combinationKey)) {
            return null;
        }
        
        // Add to processed combinations immediately to prevent duplicate processing
        processedCombinations.add(combinationKey);

        try {
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
            handleErrorWithDefault(err, `Error applying rule ${rule.name}`, null);
            return null;
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
        // Validate inputs
        if (!rule || !Array.isArray(tasks)) {
            handleErrorWithDefault(new Error('Invalid arguments to _areOperandsValid'), '_areOperandsValid validation', false);
            return false;
        }
        
        try {
            // Ensure the number of tasks matches the rule's operand definitions
            if (!Array.isArray(rule.operands) || tasks.length !== rule.operands.length) return false;
            
            return tasks.every((task, index) => {
                try {
                    // Validate that the operand validator is a function
                    if (typeof rule.operands[index] !== 'function') {
                        handleErrorWithDefault(new Error(`Operand validator at index ${index} is not a function`), `_areOperandsValid rule ${rule.name}`, false);
                        return false;
                    }
                    
                    return rule.operands[index](task);
                } catch (err) {
                    handleErrorWithDefault(err, `Error validating operand for rule ${rule.name}`, false);
                    return false;
                }
            });
        } catch (err) {
            handleErrorWithDefault(err, `Error validating operands for rule ${rule.name}`, false);
            return false;
        }
    }

    /**
     * Get the list of available rules
     * @returns {Array} Array of rule names
     */
    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    /**
     * Get a specific rule by name
     * @param {string} name - The name of the rule
     * @returns {object|null} The rule object or null if not found
     */
    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    /**
     * Get rule statistics and performance information
     * @returns {object} Rule statistics
     */
    getRuleStatistics() {
        return {
            totalRules: this.rules.length,
            ruleNames: this.rules.map(rule => rule.name),
            rulesByArity: this.rules.reduce((acc, rule) => {
                const arity = rule.arity || 0;
                if (!acc[arity]) {
                    acc[arity] = [];
                }
                acc[arity].push(rule.name);
                return acc;
            }, {})
        };
    }
}

module.exports = Reasoner;
