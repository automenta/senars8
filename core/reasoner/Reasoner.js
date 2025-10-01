/**
 * High-quality Reasoner class that coordinates symbolic, temporal, and modular reasoning
 * This refactored version improves maintainability and prepares for modular reasoning strategies
 */

import rules from './rules/index.js';
import {debug, error as logError, info, warn} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import {SystemCommands} from '../system/SystemCommands.js';
import {SystemContext} from './SystemContext.js';

const errorHandler = createUnifiedErrorHandler('Reasoner');

class Reasoner {
    /**
     * @param {ConfigManager} configManager - System configuration manager
     * @param {TemporalReasoner} temporalReasoner - Temporal reasoning component
     * @param {StrategyRegistry} strategyRegistry - Registry for various strategy types
     * @param {CommandBus} commandBus - System command bus
     */
    constructor(configManager, temporalReasoner, strategyRegistry, commandBus) {
        this.config = createConfigAccessor(configManager, 'reasoner');
        this.temporalReasoner = temporalReasoner;
        this.strategyRegistry = strategyRegistry;
        this.commandBus = commandBus;
        this.rules = rules;

        // Initialize combination sampling strategy (for selecting task combinations to apply rules to)
        this.combinationStrategy = this._initializeCombinationStrategy();

        // Initialize modular reasoning context
        this.systemContext = null;

        // Initialize internal state
        this._processedCombinations = new Map(); // Changed from Set to Map for better performance tracking
        this._initiationTime = Date.now();

        // Register system command handlers
        this._registerCommandHandlers();

        info(`Reasoner initialized with combination strategy: ${this.combinationStrategy.constructor.name}`);
    }

    /**
     * Initializes the combination selection strategy (for choosing task combinations to apply reasoning rules)
     * @private
     * @returns {object} The initialized combination strategy
     */
    _initializeCombinationStrategy() {
        const strategyName = this.config.getString('strategy', 'BagSamplingStrategy');
        try {
            return this.strategyRegistry.getCombinationStrategy(strategyName);
        } catch (error) {
            warn(`Falling back to default combination strategy due to error: ${error.message}`);
            // Return a default strategy if the configured one fails
            return this.strategyRegistry.getCombinationStrategy('BagSampling');
        }
    }

    /**
     * Sets up the system context for modular reasoning strategies
     * @param {SystemContext} systemContext - The system context to use
     */
    setSystemContext(systemContext) {
        this.systemContext = systemContext;
    }

    /**
     * Registers command handlers for system events
     * @private
     */
    _registerCommandHandlers() {
        this.commandBus.handle(
            SystemCommands.REASONER_PROCESS_TASK,
            async (payload) => this.performInference(payload.focusSet, payload.options)
        );
    }

    /**
     * Generates a unique key for a combination of tasks for a specific rule
     * @private
     * @param {string} ruleName - Name of the reasoning rule
     * @param {Task[]} tasks - Array of tasks in the combination
     * @returns {string} Unique combination key
     */
    _getCombinationKey(ruleName, tasks) {
        // Sort task IDs to ensure consistent keys regardless of task order
        const sortedTaskIds = tasks.map(t => t.id).sort();
        return `${ruleName}:${sortedTaskIds.join(',')}`;
    }

    /**
     * Performs comprehensive inference using symbolic, temporal, and modular reasoning
     * @param {Task[]} focusSet - Set of tasks to reason about
     * @param {object} options - Inference options
     * @param {number} [options.maxDerivedTasks=Infinity] - Maximum number of tasks to derive
     * @param {boolean} [options.enableModularReasoning=true] - Whether to use modular reasoning strategies
     * @param {boolean} [options.enableSymbolicReasoning=true] - Whether to use symbolic reasoning
     * @param {boolean} [options.enableTemporalReasoning=true] - Whether to use temporal reasoning
     * @returns {Promise<Task[]>} Array of derived tasks
     */
    async performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return errorHandler.handle(
                new Error(`Focus set must be an array, received: ${typeof focusSet}`),
                'performInference',
                []
            );
        }

        if (focusSet.length === 0) {
            debug('Empty focus set, returning empty result');
            return [];
        }

        const {
            maxDerivedTasks = Infinity,
            enableModularReasoning = true,
            enableSymbolicReasoning = true,
            enableTemporalReasoning = true
        } = options;

        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        let allDerivedTasks = [];

        // Apply symbolic reasoning if enabled
        if (enableSymbolicReasoning) {
            const symbolicTasks = await this.#performSymbolicInference(focusSet, maxDerivedTasks);
            allDerivedTasks.push(...symbolicTasks);
        }

        // Apply temporal reasoning if enabled and there's capacity
        if (enableTemporalReasoning && allDerivedTasks.length < maxDerivedTasks) {
            const remainingCapacity = maxDerivedTasks - allDerivedTasks.length;
            const temporalTasks = remainingCapacity > 0
                ? this.#performTemporalInference(focusSet, remainingCapacity)
                : [];
            allDerivedTasks.push(...temporalTasks);
        }

        // Apply modular reasoning if enabled and there's capacity
        if (enableModularReasoning && allDerivedTasks.length < maxDerivedTasks && this.systemContext) {
            const remainingCapacity = maxDerivedTasks - allDerivedTasks.length;
            const modularTasks = await this.#performModularInference(focusSet, remainingCapacity);
            allDerivedTasks.push(...modularTasks);
        }

        // Limit to the maximum derived tasks and return
        const finalTasks = allDerivedTasks.slice(0, maxDerivedTasks);
        debug(`Total inference produced ${finalTasks.length} derived tasks`);

        return finalTasks;
    }

    /**
     * Performs symbolic inference using the built-in reasoning rules
     * @private
     * @param {Task[]} focusSet - Set of tasks to reason about
     * @param {number} maxDerived - Maximum number of tasks to derive
     * @returns {Promise<Task[]>} Array of derived tasks from symbolic reasoning
     */
    async #performSymbolicInference(focusSet, maxDerived) {
        const derivedTasks = [];

        // Clear the processed combinations cache for this inference cycle
        this._processedCombinations.clear();

        debug(`Starting symbolic inference with ${this.rules.length} rules on ${focusSet.length} tasks`);

        // Track performance metrics
        let ruleApplications = 0;
        let successfulApplications = 0;

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerived) {
                debug(`Reached maximum derived tasks limit (${maxDerived}), stopping symbolic inference`);
                break;
            }

            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity: ${rule.arity}`);
                continue;
            }

            // Get combinations of tasks for this rule
            const combinations = this.combinationStrategy.selectCombinations(focusSet, rule.arity);

            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerived) {
                    break; // Check again after getting new combinations
                }

                ruleApplications++;
                const derived = await this._applyRule(rule, tasks);

                if (derived) {
                    derivedTasks.push(derived);
                    successfulApplications++;

                    // Track this combination to avoid reprocessing
                    const combinationKey = this._getCombinationKey(rule.name, tasks);
                    this._processedCombinations.set(combinationKey, {
                        timestamp: Date.now(),
                        ruleName: rule.name
                    });
                }
            }
        }

        const successRate = ruleApplications > 0 ? successfulApplications / ruleApplications : 0;
        debug(
            `Symbolic inference: ${ruleApplications} applications, ` +
            `${successfulApplications} successes, ${derivedTasks.length} derived tasks, ` +
            `success rate: ${(successRate * 100).toFixed(2)}%`
        );

        return derivedTasks;
    }

    /**
     * Performs temporal inference using the TemporalReasoner
     * @private
     * @param {Task[]} focusSet - Set of tasks to reason about
     * @param {number} maxTemporalTasks - Maximum number of temporal tasks to derive
     * @returns {Task[]} Array of derived tasks from temporal reasoning
     */
    #performTemporalInference(focusSet, maxTemporalTasks) {
        return errorHandler.executeSync(() => {
            debug(`Starting temporal inference on ${focusSet.length} tasks with max ${maxTemporalTasks} derived tasks`);

            const temporalTasks = this.temporalReasoner.infer(focusSet);

            if (Array.isArray(temporalTasks)) {
                // Limit to the maximum number of temporal tasks
                const limitedTemporalTasks = temporalTasks.slice(0, maxTemporalTasks);
                debug(`Temporal inference produced ${limitedTemporalTasks.length} derived tasks`);
                return limitedTemporalTasks;
            }

            debug('Temporal inference returned invalid result');
            return [];
        }, 'performTemporalInference', []);
    }

    /**
     * Performs modular reasoning using registered reasoning strategies
     * @private
     * @param {Task[]} focusSet - Set of tasks to reason about
     * @param {number} maxModularTasks - Maximum number of modular tasks to derive
     * @returns {Promise<Task[]>} Array of derived tasks from modular reasoning
     */
    async #performModularInference(focusSet, maxModularTasks) {
        if (!this.systemContext) {
            debug('System context not available, skipping modular reasoning');
            return [];
        }

        return errorHandler.execute(async () => {
            debug(`Starting modular inference on ${focusSet.length} tasks with max ${maxModularTasks} derived tasks`);

            const derivedTasks = [];
            const allReasoningStrategies = this.strategyRegistry.getAllReasoningStrategies();

            for (const task of focusSet) {
                if (derivedTasks.length >= maxModularTasks) {
                    debug(`Reached maximum modular tasks limit (${maxModularTasks}), stopping modular inference`);
                    break;
                }

                // Find strategies applicable to this task
                const applicableStrategies = this.strategyRegistry.findApplicableStrategies(task, this.systemContext);

                for (const {name: strategyName, instance: strategy} of applicableStrategies) {
                    if (derivedTasks.length >= maxModularTasks) {
                        break; // Check again after finding applicable strategies
                    }

                    try {
                        const validation = strategy.validate(task);
                        if (!validation.isValid) {
                            debug(`Strategy "${strategyName}" validation failed for task:`, validation.errors);
                            continue;
                        }

                        const result = await strategy.execute(task, this.systemContext);

                        if (result.success && Array.isArray(result.inferredTasks)) {
                            for (const inferredTask of result.inferredTasks) {
                                if (derivedTasks.length >= maxModularTasks) {
                                    break;
                                }
                                derivedTasks.push(inferredTask);
                            }
                        }
                    } catch (error) {
                        logError(`Error executing reasoning strategy "${strategyName}":`, error);
                    }
                }
            }

            debug(`Modular inference produced ${derivedTasks.length} derived tasks using ${allReasoningStrategies.length} strategies`);
            return derivedTasks;
        }, 'performModularInference', []);
    }

    /**
     * Checks if a rule is applicable to a set of tasks
     * @private
     * @param {object} rule - The reasoning rule to check
     * @param {Task[]} tasks - Array of tasks to apply the rule to
     * @returns {boolean} Whether the rule is applicable
     */
    _isRuleApplicable(rule, tasks) {
        // Validate task array structure
        if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
            debug(`Skipping invalid combination for rule ${rule.name} - expected ${rule.arity} tasks, got ${tasks?.length}`);
            return false;
        }

        // Check if this combination has already been processed in this inference cycle
        const combinationKey = this._getCombinationKey(rule.name, tasks);
        if (this._processedCombinations.has(combinationKey)) {
            debug(`Skipping already processed combination for rule ${rule.name}`);
            return false;
        }

        // Validate operands if specified in the rule
        const operandsValid = this._areOperandsValid(rule, tasks);
        if (!operandsValid) {
            debug(`Operands validation failed for rule ${rule.name}`);
            return false;
        }

        // Check the rule's specific condition
        let conditionResult = false;
        try {
            conditionResult = rule.condition(...tasks);
        } catch (error) {
            logError(`Error checking condition for rule ${rule.name}:`, error);
            return false;
        }

        if (!conditionResult) {
            debug(`Rule condition not met for rule ${rule.name}`);
            return false;
        }

        return true;
    }

    /**
     * Applies a reasoning rule to a set of tasks
     * @private
     * @param {object} rule - The reasoning rule to apply
     * @param {Task[]} tasks - Array of tasks to apply the rule to
     * @returns {Promise<Task|null>} The derived task or null if the rule could not be applied
     */
    async _applyRule(rule, tasks) {
        if (!this._isRuleApplicable(rule, tasks)) {
            return null;
        }

        try {
            // Apply the rule action
            const result = await Promise.resolve(rule.action(...tasks));

            if (result) {
                debug(`Rule ${rule.name} successfully applied`);
                return result;
            } else {
                debug(`Rule ${rule.name} applied but returned no result`);
                return null;
            }
        } catch (error) {
            logError(`Error applying rule ${rule.name}:`, error);
            return null;
        }
    }

    /**
     * Validates that the operands for a rule are valid
     * @private
     * @param {object} rule - The reasoning rule
     * @param {Task[]} tasks - Array of tasks to validate
     * @returns {boolean} Whether all operands are valid
     */
    _areOperandsValid(rule, tasks) {
        if (!rule.operands) return true;

        return rule.operands.every((validator, i) => {
            if (typeof validator !== 'function') {
                logError(`Operand validator at index ${i} for rule ${rule.name} is not a function.`);
                return false;
            }

            try {
                const isValid = validator(tasks[i]);
                if (!isValid) {
                    debug(`Task at index ${i} failed validation for rule ${rule.name}`);
                }
                return isValid;
            } catch (error) {
                logError(`Error validating operand at index ${i} for rule ${rule.name}:`, error);
                return false;
            }
        });
    }

    /**
     * Gets the names of all available reasoning rules
     * @returns {string[]} Array of rule names
     */
    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    /**
     * Gets a specific reasoning rule by name
     * @param {string} name - Name of the rule to retrieve
     * @returns {object|null} The rule object or null if not found
     */
    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    /**
     * Gets statistics about the reasoning rules
     * @returns {object} Statistics about the rules
     */
    getRuleStatistics() {
        const stats = this.rules.reduce((acc, rule) => {
            const arity = rule.arity || 0;
            if (!acc[arity]) {
                acc[arity] = [];
            }
            acc[arity].push(rule.name);
            return acc;
        }, {});

        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames(),
            rulesByArity: stats,
            uptime: Date.now() - this._initiationTime
        };
    }

    /**
     * Gets statistics about reasoning performance
     * @returns {object} Performance statistics
     */
    getPerformanceStats() {
        return {
            processedCombinationsCount: this._processedCombinations.size,
            uptime: Date.now() - this._initiationTime,
            combinationStrategy: this.combinationStrategy.constructor.name
        };
    }
}

export default Reasoner;