import BagSamplingStrategy from './strategies/BagSamplingStrategy.js';
import rules from './rules/index.js';
import TemporalReasoner from './TemporalReasoner.js';
import { debug, error as logError, info } from '../utils/logger.js';
import { handleError } from '../utils/error-handler.js';

/**
 * Reasoner performs symbolic inference and manages the rule application process.
 * It uses various strategies to select task combinations and apply inference rules.
 *
 * The Reasoner is responsible for:
 * 1. Applying inference rules to tasks
 * 2. Managing different types of reasoning (symbolic, temporal)
 * 3. Coordinating with strategies for task selection
 * 4. Tracking and limiting the number of derived tasks
 */
class Reasoner {
    /**
     * Creates a new Reasoner instance.
     * @param {object} [options] - Configuration options
     * @param {object} [options.strategy] - The strategy for selecting task combinations
     * @param {TemporalReasoner} [options.temporalReasoner] - The temporal reasoner instance
     */
    constructor({ strategy = new BagSamplingStrategy(), temporalReasoner = new TemporalReasoner() } = {}) {
        this.strategy = strategy;
        this.rules = rules;
        this.temporalReasoner = temporalReasoner;
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    /**
     * Performs inference on a focus set of tasks
     *
     * This method orchestrates the entire inference process:
     * 1. Performs symbolic inference using registered rules
     * 2. Performs temporal inference if needed
     * 3. Limits the number of derived tasks to maxDerivedTasks
     *
     * @param {Task[]} focusSet - Array of tasks to perform inference on
     * @param {object} [options] - Configuration options
     * @param {number} [options.maxDerivedTasks=Infinity] - Maximum number of derived tasks to generate
     * @returns {Task[]} Array of derived tasks
     */
    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return handleError(new Error('Focus set must be an array'), 'Reasoner.performInference', false);
        }

        const { maxDerivedTasks = Infinity } = options;
        debug(`Performing inference on ${focusSet.length} tasks`);

        let derivedTasks = this._performSymbolicInference(focusSet, maxDerivedTasks);

        if (derivedTasks.length < maxDerivedTasks) {
            const temporalTasks = this._performTemporalInference(focusSet);
            derivedTasks = [...derivedTasks, ...temporalTasks];
        }

        const finalTasks = derivedTasks.slice(0, maxDerivedTasks);

        debug(`Total inference produced ${finalTasks.length} derived tasks`);
        return finalTasks;
    }

    /**
     * Performs symbolic inference on a focus set of tasks
     *
     * Iterates through all registered rules and applies them to combinations
     * of tasks selected by the strategy. Respects the maxDerivedTasks limit.
     *
     * @param {Task[]} focusSet - Array of tasks to perform inference on
     * @param {number} maxDerivedTasks - Maximum number of derived tasks to generate
     * @returns {Task[]} Array of derived tasks
     * @private
     */
    _performSymbolicInference(focusSet, maxDerivedTasks) {
        let derivedTasks = [];
        const processedCombinations = new Set();

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) { break; }
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity`);
                continue;
            }
            const newTasks = this._applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks - derivedTasks.length);
            if (newTasks.length > 0) {
                derivedTasks = derivedTasks.concat(newTasks);
            }
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);
        return derivedTasks;
    }

    /**
     * Applies a rule to combinations of tasks
     *
     * Uses the strategy to select combinations of tasks and applies
     * the given rule to each combination, respecting the maxDerivedTasks limit.
     *
     * @param {object} rule - The rule to apply
     * @param {Task[]} focusSet - Array of tasks to select combinations from
     * @param {Set} processedCombinations - Set of already processed combinations
     * @param {number} maxDerivedTasks - Maximum number of derived tasks to generate
     * @returns {Task[]} Array of derived tasks
     * @private
     */
    _applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks) {
        const derivedTasks = [];
        try {
            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerivedTasks) { break; }
                if (!Array.isArray(tasks) || tasks.length !== rule.arity) { continue; }

                const derived = this._applyRule(rule, tasks, processedCombinations);
                if (derived) {
                    derivedTasks.push(derived);
                }
            }
        } catch (err) {
            logError(`Error applying rule ${rule.name}:`, err);
        }
        return derivedTasks;
    }

    /**
     * Performs temporal inference on a focus set of tasks
     *
     * Delegates to the temporal reasoner to perform temporal reasoning
     * on the given focus set of tasks.
     *
     * @param {Task[]} focusSet - Array of tasks to perform temporal inference on
     * @returns {Task[]} Array of derived tasks from temporal reasoning
     * @private
     */
    _performTemporalInference(focusSet) {
        try {
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            if (Array.isArray(temporalTasks)) {
                debug(`Temporal inference produced ${temporalTasks.length} derived tasks`);
                return temporalTasks;
            }
            return [];
        } catch (err) {
            logError('Error in temporal inference:', err);
            return [];
        }
    }

    /**
     * Applies a rule to a specific combination of tasks
     *
     * Checks if the rule can be applied to the given tasks and,
     * if so, executes the rule's action to generate new tasks.
     *
     * @param {object} rule - The rule to apply
     * @param {Task[]} tasks - Array of tasks to apply the rule to
     * @param {Set} processedCombinations - Set of already processed combinations
     * @returns {Task|null} The derived task or null if the rule cannot be applied
     * @private
     */
    _applyRule(rule, tasks, processedCombinations) {
        if (!rule || !Array.isArray(tasks) || !processedCombinations) {
            return handleError(new Error('Invalid arguments to _applyRule'), '_applyRule validation', false);
        }

        const taskIds = tasks.map(task => task.id).sort();
        const combinationKey = `${rule.name}:${taskIds.join(',')}`;

        // Avoid processing the same combination multiple times
        if (processedCombinations.has(combinationKey)) { return null; }
        processedCombinations.add(combinationKey);

        try {
            if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
                const result = rule.action(...tasks);
                if (result) {
                    debug(`Rule ${rule.name} applied successfully`);
                }
                return result;
            }
            return null;
        } catch (err) {
            logError(`Error applying rule ${rule.name}:`, err);
            return null;
        }
    }

    /**
     * Validates that all operands for a rule are valid
     *
     * Checks that each task in the combination satisfies the
     * corresponding operand validator function for the rule.
     *
     * @param {object} rule - The rule to validate operands for
     * @param {Task[]} tasks - Array of tasks to validate
     * @returns {boolean} True if all operands are valid
     * @private
     */
    _areOperandsValid(rule, tasks) {
        if (!rule || !Array.isArray(rule.operands) || !Array.isArray(tasks) || tasks.length !== rule.operands.length) {
            return false;
        }

        return tasks.every((task, index) => {
            const validator = rule.operands[index];
            if (typeof validator !== 'function') {
                logError(`Operand validator at index ${index} for rule ${rule.name} is not a function.`);
                return false;
            }
            try {
                return validator(task);
            } catch (err) {
                logError(`Error validating operand for rule ${rule.name}:`, err);
                return false;
            }
        });
    }

    /**
     * Gets the names of all available rules
     * @returns {string[]} Array of rule names
     */
    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    /**
     * Gets a rule by name
     * @param {string} name - The name of the rule to retrieve
     * @returns {object|null} The rule object or null if not found
     */
    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    /**
     * Gets statistics about the available rules
     *
     * Provides information about the total number of rules,
     * their names, and how they are grouped by arity.
     *
     * @returns {object} Rule statistics including total count, names, and arity grouping
     */
    getRuleStatistics() {
        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames(),
            rulesByArity: this.rules.reduce((acc, rule) => {
                const arity = rule.arity || 0;
                acc[arity] = acc[arity] || [];
                acc[arity].push(rule.name);
                return acc;
            }, {})
        };
    }
}

export default Reasoner;
