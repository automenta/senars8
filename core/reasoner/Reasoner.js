import rules from './rules/index.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createUnifiedErrorHandler('Reasoner');

class Reasoner {
    #processedCombinations = new Set();

    constructor(configManager, temporalReasoner, strategyRegistry) {
        this.config = createConfigAccessor(configManager, 'reasoner');
        this.temporalReasoner = temporalReasoner;
        this.strategyRegistry = strategyRegistry;
        this.rules = rules;
        this.strategy = this.#initializeStrategy();
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    #initializeStrategy() {
        const strategyName = this.config.getString('strategy', 'BagSamplingStrategy');
        return this.strategyRegistry.getStrategy(strategyName);
    }

    #getCombinationKey(ruleName, tasks) {
        const taskIds = tasks.map(t => t.id).sort();
        return `${ruleName}:${taskIds.join(',')}`;
    }

    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return errorHandler.handle(new Error(`Focus set must be an array, received: ${typeof focusSet}`), 'performInference', []);
        }

        const maxDerived = options.maxDerivedTasks ?? Infinity;
        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerived} derived tasks`);

        const symbolicTasks = this.#performSymbolicInference(focusSet, maxDerived);

        const remainingCapacity = maxDerived - symbolicTasks.length;
        const temporalTasks = remainingCapacity > 0 ? this.#performTemporalInference(focusSet) : [];

        const finalTasks = [...symbolicTasks, ...temporalTasks].slice(0, maxDerived);
        debug(`Total inference produced ${finalTasks.length} derived tasks`);
        return finalTasks;
    }

    #performSymbolicInference(focusSet, maxDerived) {
        const derivedTasks = [];
        this.#processedCombinations.clear();
        debug(`Starting symbolic inference with ${this.rules.length} rules`);

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerived) break;
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity: ${rule.arity}`);
                continue;
            }

            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerived) break;

                const derived = this.#applyRule(rule, tasks);
                if (derived) {
                    derivedTasks.push(derived);
                }
            }
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);
        return derivedTasks;
    }

    #performTemporalInference(focusSet) {
        return errorHandler.executeSync(() => {
            debug(`Starting temporal inference on ${focusSet.length} tasks`);
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            if (Array.isArray(temporalTasks)) {
                debug(`Temporal inference produced ${temporalTasks.length} derived tasks`);
                return temporalTasks;
            }
            debug('Temporal inference returned invalid result');
            return [];
        }, 'performTemporalInference', []);
    }

    #isRuleApplicable(rule, tasks) {
        if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
            debug(`Skipping invalid combination for rule ${rule.name}`);
            return false;
        }

        const combinationKey = this.#getCombinationKey(rule.name, tasks);
        if (this.#processedCombinations.has(combinationKey)) {
            debug(`Skipping already processed combination for rule ${rule.name}`);
            return false;
        }
        this.#processedCombinations.add(combinationKey);

        return this.#areOperandsValid(rule, tasks) && rule.condition(...tasks);
    }

    #applyRule(rule, tasks) {
        if (!this.#isRuleApplicable(rule, tasks)) {
            return null;
        }
        const result = rule.action(...tasks);
        debug(`Rule ${rule.name} ${result ? 'applied' : 'condition not met'}`);
        return result;
    }

    #areOperandsValid(rule, tasks) {
        if (!rule.operands) return true;

        return rule.operands.every((validator, i) => {
            if (typeof validator !== 'function') {
                logError(`Operand validator at index ${i} for rule ${rule.name} is not a function.`);
                return false;
            }
            const isValid = validator(tasks[i]);
            if (!isValid) {
                debug(`Task at index ${i} failed validation for rule ${rule.name}`);
            }
            return isValid;
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
            if (!acc[arity]) {
                acc[arity] = [];
            }
            acc[arity].push(rule.name);
            return acc;
        }, {});

        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames(),
            rulesByArity
        };
    }
}

export default Reasoner;
