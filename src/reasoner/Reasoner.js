import BagSamplingStrategy from './strategies/BagSamplingStrategy.js';
import BruteForceStrategy from './strategies/BruteForceStrategy.js';
import rules from './rules/index.js';
import TemporalReasoner from './TemporalReasoner.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import defaultConfig from '../config/default-config.js';

const errorHandler = createModuleErrorHandler('Reasoner');

/**
 * Reasoner performs symbolic logical inference on tasks using a set of predefined rules.
 * It supports different strategies for selecting task combinations and can perform both
 * symbolic and temporal reasoning.
 */
class Reasoner {
    /**
     * Creates a new Reasoner instance.
     * @param {object} components - Component dependencies
     * @param {TemporalReasoner} [components.temporalReasoner] - Temporal reasoner instance
     * @param {object} config - Reasoner configuration
     */
    constructor({temporalReasoner} = {}, config = defaultConfig.reasoner) {
        // Validate and set configuration with defaults
        this.config = {
            strategy: typeof config.strategy === 'string' ? config.strategy : 'BagSampling'
        };

        this.temporalReasoner = temporalReasoner || new TemporalReasoner();
        this.strategy = this._initializeStrategy(this.config.strategy);
        this.rules = rules;
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    _initializeStrategy(strategyName) {
        if (strategyName === 'BruteForce') {
            return new BruteForceStrategy();
        }
        if (strategyName === 'BagSampling') {
            return new BagSamplingStrategy();
        }
        // Default to BagSamplingStrategy
        return new BagSamplingStrategy();
    }

    /**
     * Performs inference on a set of tasks.
     * @param {Task[]} focusSet - Array of tasks to perform inference on
     * @param {object} options - Inference options
     * @param {number} [options.maxDerivedTasks=Infinity] - Maximum number of derived tasks to return
     * @returns {Task[]} Array of derived tasks
     */
    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            const error = new Error(`Focus set must be an array, received: ${typeof focusSet}`);
            return errorHandler.handle(error, 'performInference', []);
        }

        const {maxDerivedTasks = Infinity} = options;
        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        let derivedTasks = this._performSymbolicInference(focusSet, maxDerivedTasks);

        if (derivedTasks.length < maxDerivedTasks) {
            const temporalTasks = this._performTemporalInference(focusSet);
            derivedTasks = [...derivedTasks, ...temporalTasks];
        }

        const finalTasks = derivedTasks.slice(0, maxDerivedTasks);
        debug(`Total inference produced ${finalTasks.length} derived tasks`);
        return finalTasks;
    }

    _performSymbolicInference(focusSet, maxDerivedTasks) {
        let derivedTasks = [];
        const processedCombinations = new Set();

        debug(`Starting symbolic inference with ${this.rules.length} rules`);
        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) {
                debug(`Reached maximum derived tasks limit of ${maxDerivedTasks}`);
                break;
            }
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity: ${rule.arity}`);
                continue;
            }
            const newTasks = this._applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks - derivedTasks.length);
            if (newTasks.length > 0) {
                derivedTasks = derivedTasks.concat(newTasks);
                debug(`Rule ${rule.name} produced ${newTasks.length} new tasks`);
            }
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);
        return derivedTasks;
    }

    _applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks) {
        const derivedTasks = [];
        try {
            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            debug(`Rule ${rule.name} selected ${combinations.length} combinations to process`);

            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerivedTasks) {
                    debug(`Reached maximum derived tasks limit of ${maxDerivedTasks} for rule ${rule.name}`);
                    break;
                }
                if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
                    debug(`Skipping invalid combination for rule ${rule.name}: expected ${rule.arity} tasks, got ${tasks.length}`);
                    continue;
                }

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

    _performTemporalInference(focusSet) {
        try {
            debug(`Starting temporal inference on ${focusSet.length} tasks`);
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            if (Array.isArray(temporalTasks)) {
                debug(`Temporal inference produced ${temporalTasks.length} derived tasks`);
                return temporalTasks;
            }
            debug('Temporal inference returned invalid result, expected array');
            return [];
        } catch (err) {
            logError('Error in temporal inference:', err);
            return [];
        }
    }

    _applyRule(rule, tasks, processedCombinations) {
        if (!rule || !Array.isArray(tasks) || !processedCombinations) {
            const error = new Error('Invalid arguments to _applyRule');
            return errorHandler.handle(error, '_applyRule validation', null);
        }

        const taskIds = tasks.map(task => task.id).sort();
        const combinationKey = `${rule.name}:${taskIds.join(',')}`;

        if (processedCombinations.has(combinationKey)) {
            debug(`Skipping already processed combination for rule ${rule.name}`);
            return null;
        }
        processedCombinations.add(combinationKey);

        try {
            if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
                const result = rule.action(...tasks);
                if (result) {
                    debug(`Rule ${rule.name} applied successfully`);
                } else {
                    debug(`Rule ${rule.name} action returned null/undefined`);
                }
                return result;
            }
            debug(`Rule ${rule.name} condition not met`);
            return null;
        } catch (err) {
            logError(`Error applying rule ${rule.name}:`, err);
            return null;
        }
    }

    _areOperandsValid(rule, tasks) {
        if (!rule || !Array.isArray(rule.operands) || !Array.isArray(tasks) || tasks.length !== rule.operands.length) {
            return false;
        }

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const validator = rule.operands[i];

            if (typeof validator !== 'function') {
                logError(`Operand validator at index ${i} for rule ${rule.name} is not a function.`);
                return false;
            }

            try {
                const isValid = validator(task);
                if (!isValid) {
                    debug(`Task at index ${i} failed validation for rule ${rule.name}`);
                }
                return isValid;
            } catch (err) {
                logError(`Error validating operand at index ${i} for rule ${rule.name}:`, err);
                return false;
            }
        }

        return true;
    }

    /**
     * Gets the names of all available rules.
     * @returns {string[]} Array of rule names
     */
    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    /**
     * Gets a rule by name.
     * @param {string} name - The name of the rule
     * @returns {object|null} The rule object or null if not found
     */
    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    /**
     * Gets statistics about available rules.
     * @returns {object} Object containing rule statistics
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
