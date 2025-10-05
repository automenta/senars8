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
    constructor(configManager, temporalReasoner, strategyRegistry, commandBus) {
        this.config = createConfigAccessor(configManager, 'reasoner');
        this.temporalReasoner = temporalReasoner;
        this.strategyRegistry = strategyRegistry;
        this.commandBus = commandBus;
        this.rules = rules;
        this.systemContext = null;
        this._processedCombinations = new Map();
        this._initiationTime = Date.now();

        this.combinationStrategy = this._initializeCombinationStrategy();
        this._registerCommandHandlers();

        info(`Reasoner initialized with combination strategy: ${this.combinationStrategy.constructor.name}`);
    }

    _initializeCombinationStrategy() {
        const strategyName = this.config.getString('strategy', 'BagSamplingStrategy');
        try {
            return this.strategyRegistry.getCombinationStrategy(strategyName);
        } catch (error) {
            warn(`Falling back to default combination strategy due to error: ${error.message}`);
            return this.strategyRegistry.getCombinationStrategy('BagSampling');
        }
    }

    setSystemContext(systemContext) {
        this.systemContext = systemContext;
    }

    _registerCommandHandlers() {
        this.commandBus.handle(SystemCommands.REASONER_PROCESS_TASK, async (payload) => this.performInference(payload.focusSet, payload.options));
    }

    _getCombinationKey(ruleName, tasks) {
        const taskIds = tasks.length <= 2 ? tasks.map(t => t.id) : tasks.map(t => t.id).sort();
        return `${ruleName}:${taskIds.join(',')}`;
    }

    async performInference(focusSet, options = {}) {
        return !Array.isArray(focusSet)
            ? errorHandler.handle(new Error(`Focus set must be an array, received: ${typeof focusSet}`), 'performInference', [])
            : focusSet.length === 0
            ? []
            : this.#executeInference(focusSet, options);
    }

    async #executeInference(focusSet, options) {
        const {maxDerivedTasks = Infinity, enableModularReasoning = true, enableSymbolicReasoning = true, enableTemporalReasoning = true} = options;

        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        let allDerivedTasks = [];

        enableSymbolicReasoning && (allDerivedTasks.push(...await this.#performSymbolicInference(focusSet, maxDerivedTasks)));
        enableTemporalReasoning && allDerivedTasks.length < maxDerivedTasks && (allDerivedTasks.push(...this.#performTemporalInference(focusSet, maxDerivedTasks - allDerivedTasks.length)));
        enableModularReasoning && allDerivedTasks.length < maxDerivedTasks && this.systemContext && (allDerivedTasks.push(...await this.#performModularInference(focusSet, maxDerivedTasks - allDerivedTasks.length)));

        const finalTasks = allDerivedTasks.slice(0, maxDerivedTasks);
        debug(`Total inference produced ${finalTasks.length} derived tasks`);

        return finalTasks;
    }

    async #performSymbolicInference(focusSet, maxDerived) {
        const derivedTasks = [];
        this._processedCombinations.size > 1000 && this._processedCombinations.clear();

        debug(`Starting symbolic inference with ${this.rules.length} rules on ${focusSet.length} tasks`);

        let [ruleApplications, successfulApplications] = [0, 0];

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerived) {
                debug(`Reached maximum derived tasks limit (${maxDerived}), stopping symbolic inference`);
                break;
            }

            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity: ${rule.arity}`);
                continue;
            }

            for (const tasks of this.combinationStrategy.selectCombinations(focusSet, rule.arity)) {
                if (derivedTasks.length >= maxDerived) break;

                ruleApplications++;
                const derived = await this._applyRule(rule, tasks);
                derived && (derivedTasks.push(derived), successfulApplications++, this._trackCombination(rule.name, tasks));
            }
        }

        const successRate = ruleApplications > 0 ? successfulApplications / ruleApplications : 0;
        debug(`Symbolic inference: ${ruleApplications} applications, ${successfulApplications} successes, ${derivedTasks.length} derived tasks, success rate: ${(successRate * 100).toFixed(2)}%`);

        return derivedTasks;
    }

    _trackCombination(ruleName, tasks) {
        this._processedCombinations.set(this._getCombinationKey(ruleName, tasks), {timestamp: Date.now(), ruleName});
    }

    #performTemporalInference(focusSet, maxTemporalTasks) {
        return errorHandler.executeSync(() => {
            debug(`Starting temporal inference on ${focusSet.length} tasks with max ${maxTemporalTasks} derived tasks`);

            const temporalTasks = this.temporalReasoner.infer(focusSet);
            const limitedTasks = Array.isArray(temporalTasks) ? temporalTasks.slice(0, maxTemporalTasks) : [];

            debug(`Temporal inference produced ${limitedTasks.length} derived tasks`);
            return limitedTasks;
        }, 'performTemporalInference', []);
    }

    async #performModularInference(focusSet, maxModularTasks) {
        if (!this.systemContext) {
            debug('System context not available, skipping modular reasoning');
            return [];
        }

        return errorHandler.execute(async () => {
            debug(`Starting modular inference on ${focusSet.length} tasks with max ${maxModularTasks} derived tasks`);

            const derivedTasks = [];
            const strategies = this.strategyRegistry.getAllReasoningStrategies();

            for (const task of focusSet) {
                if (derivedTasks.length >= maxModularTasks) {
                    debug(`Reached maximum modular tasks limit (${maxModularTasks}), stopping modular inference`);
                    break;
                }

                for (const {name: strategyName, instance: strategy} of this.strategyRegistry.findApplicableStrategies(task, this.systemContext)) {
                    if (derivedTasks.length >= maxModularTasks) break;

                    try {
                        const validation = strategy.validate(task);
                        if (validation.isValid) {
                            const result = await strategy.execute(task, this.systemContext);
                            if (result.success && Array.isArray(result.inferredTasks)) {
                                for (const inferredTask of result.inferredTasks) {
                                    if (derivedTasks.length >= maxModularTasks) break;
                                    derivedTasks.push(inferredTask);
                                }
                            }
                        } else {
                            debug(`Strategy "${strategyName}" validation failed for task:`, validation.errors);
                        }
                    } catch (error) {
                        logError(`Error executing reasoning strategy "${strategyName}":`, error);
                    }
                }
            }

            debug(`Modular inference produced ${derivedTasks.length} derived tasks using ${strategies.length} strategies`);
            return derivedTasks;
        }, 'performModularInference', []);
    }

    _isRuleApplicable(rule, tasks) {
        if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
            debug(`Skipping invalid combination for rule ${rule.name} - expected ${rule.arity} tasks, got ${tasks?.length}`);
            return false;
        }

        const combinationKey = this._getCombinationKey(rule.name, tasks);
        if (this._processedCombinations.has(combinationKey)) {
            debug(`Skipping already processed combination for rule ${rule.name}`);
            return false;
        }

        return this._areOperandsValid(rule, tasks) && this._checkRuleCondition(rule, tasks);
    }

    async _applyRule(rule, tasks) {
        if (!this._isRuleApplicable(rule, tasks)) return null;

        try {
            const result = await Promise.resolve(rule.action(...tasks));
            result ? debug(`Rule ${rule.name} successfully applied`) : debug(`Rule ${rule.name} applied but returned no result`);
            return result;
        } catch (error) {
            logError(`Error applying rule ${rule.name}:`, error);
            return null;
        }
    }

    _checkRuleCondition(rule, tasks) {
        try {
            return rule.condition(...tasks);
        } catch (error) {
            logError(`Error checking condition for rule ${rule.name}:`, error);
            return false;
        }
    }

    _areOperandsValid(rule, tasks) {
        if (!rule.operands) return true;

        return rule.operands.every((validator, i) => {
            if (typeof validator !== 'function') {
                logError(`Operand validator at index ${i} for rule ${rule.name} is not a function.`);
                return false;
            }

            try {
                return validator(tasks[i]) || (debug(`Task at index ${i} failed validation for rule ${rule.name}`), false);
            } catch (error) {
                logError(`Error validating operand at index ${i} for rule ${rule.name}:`, error);
                return false;
            }
        });
    }

    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    getRuleStatistics() {
        const rulesByArity = this.rules.reduce((acc, rule) => {
            const arity = rule.arity || 0;
            (acc[arity] ||= []).push(rule.name);
            return acc;
        }, {});

        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames(),
            rulesByArity,
            uptime: Date.now() - this._initiationTime
        };
    }

    getPerformanceStats() {
        return {
            processedCombinationsCount: this._processedCombinations.size,
            uptime: Date.now() - this._initiationTime,
            combinationStrategy: this.combinationStrategy.constructor.name
        };
    }
}

export default Reasoner;