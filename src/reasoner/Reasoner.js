import BagSamplingStrategy from './strategies/BagSamplingStrategy.js';
import BruteForceStrategy from './strategies/BruteForceStrategy.js';
import rules from './rules/index.js';
import TemporalReasoner from './TemporalReasoner.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createUnifiedErrorHandler('Reasoner');

const STRATEGY_NAMES = {
    BRUTE_FORCE: 'BruteForce',
    BAG_SAMPLING: 'BagSampling',
};

const STRATEGIES = {
    [STRATEGY_NAMES.BRUTE_FORCE]: BruteForceStrategy,
    [STRATEGY_NAMES.BAG_SAMPLING]: BagSamplingStrategy,
};

class Reasoner {
    static #getCombinationKey(ruleName, tasks) {
        return `${ruleName}:${tasks.map(task => task.id).sort().join(',')}`;
    }

    /**
     * @param {object} services
     * @param {TemporalReasoner} [services.temporalReasoner] - An optional TemporalReasoner instance.
     * @param {object} configManager - The configuration manager instance.
     */
    constructor({temporalReasoner} = {}, configManager) {
        this.config = createConfigAccessor(configManager, 'reasoner');
        this.temporalReasoner = temporalReasoner || new TemporalReasoner(configManager);
        const strategyName = this.config.getString('strategy', STRATEGY_NAMES.BAG_SAMPLING);
        this.strategy = this._initializeStrategy(strategyName);
        this.rules = rules;
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    _initializeStrategy(strategyName) {
        const StrategyClass = STRATEGIES[strategyName] || BagSamplingStrategy;
        return new StrategyClass();
    }

    /**
     * Performs inference on a set of tasks.
     * @param {Array<object>} focusSet - The set of tasks to perform inference on.
     * @param {object} [options={}] - Options for the inference process.
     * @param {number} [options.maxDerivedTasks=Infinity] - The maximum number of tasks to derive.
     * @returns {Array<object>} The derived tasks.
     */
    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return errorHandler.handle(new Error(`Focus set must be an array, received: ${typeof focusSet}`), 'performInference', []);
        }

        const maxDerivedTasks = options.maxDerivedTasks ?? Infinity;
        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        const symbolicTasks = this._performSymbolicInference(focusSet, maxDerivedTasks);
        const temporalTasks = symbolicTasks.length < maxDerivedTasks ?
            this._performTemporalInference(focusSet) : [];
        const finalTasks = [...symbolicTasks, ...temporalTasks].slice(0, maxDerivedTasks);

        debug(`Total inference produced ${finalTasks.length} derived tasks`);
        return finalTasks;
    }

    #processCombinationsForRule(rule, combinations, processedCombinations, derivedTasks, maxDerivedTasks) {
        for (const tasks of combinations) {
            if (derivedTasks.length >= maxDerivedTasks) break;
            if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
                debug(`Skipping invalid combination for rule ${rule.name}`);
                continue;
            }

            const derived = this._applyRule(rule, tasks, processedCombinations);
            if (derived) {
                derivedTasks.push(derived);
            }
        }
    }

    _performSymbolicInference(focusSet, maxDerivedTasks) {
        const derivedTasks = [];
        const processedCombinations = new Set();
        debug(`Starting symbolic inference with ${this.rules.length} rules`);

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) break;
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity: ${rule.arity}`);
                continue;
            }

            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            debug(`Rule ${rule.name} selected ${combinations.length} combinations`);

            this.#processCombinationsForRule(rule, combinations, processedCombinations, derivedTasks, maxDerivedTasks);
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);
        return derivedTasks;
    }

    _performTemporalInference(focusSet) {
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

    _applyRule(rule, tasks, processedCombinations) {
        const combinationKey = Reasoner.#getCombinationKey(rule.name, tasks);
        if (processedCombinations.has(combinationKey)) {
            debug(`Skipping already processed combination for rule ${rule.name}`);
            return null;
        }
        processedCombinations.add(combinationKey);

        if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
            const result = rule.action(...tasks);
            debug(`Rule ${rule.name} ${result ? 'applied' : 'condition not met'}`);
            return result;
        }
        return null;
    }

    _areOperandsValid(rule, tasks) {
        return rule?.operands?.every((validator, i) => {
            if (typeof validator !== 'function') {
                logError(`Operand validator at index ${i} for rule ${rule.name} is not a function.`);
                return false;
            }
            const isValid = validator(tasks[i]);
            if (!isValid) debug(`Task at index ${i} failed validation for rule ${rule.name}`);
            return isValid;
        }) ?? true;
    }

    /**
     * Gets the names of all available rules.
     * @returns {Array<string>} A list of rule names.
     */
    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    /**
     * Gets a rule by its name.
     * @param {string} name - The name of the rule to get.
     * @returns {object|null} The rule object, or null if not found.
     */
    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    /**
     * Gets statistics about the available rules.
     * @returns {object} An object containing rule statistics.
     */
    getRuleStatistics() {
        const rulesByArity = {};
        this.rules.forEach(rule => {
            const arity = rule.arity || 0;
            if (!rulesByArity[arity]) rulesByArity[arity] = [];
            rulesByArity[arity].push(rule.name);
        });

        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames(),
            rulesByArity
        };
    }
}

export default Reasoner;
