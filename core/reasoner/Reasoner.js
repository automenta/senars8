import BagSamplingStrategy from './strategies/BagSamplingStrategy.js';
import BruteForceStrategy from './strategies/BruteForceStrategy.js';
import rules from './rules/index.js';
import TemporalReasoner from './TemporalReasoner.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createUnifiedErrorHandler('Reasoner');

const STRATEGIES = {
    BruteForce: BruteForceStrategy,
    BagSampling: BagSamplingStrategy,
};

const getCombinationKey = (ruleName, tasks) =>
    `${ruleName}:${tasks.map(task => task.id).sort().join(',')}`;

class Reasoner {
    constructor({temporalReasoner} = {}, configManager) {
        this.config = createConfigAccessor(configManager, 'reasoner');
        this.temporalReasoner = temporalReasoner || new TemporalReasoner(configManager);
        const strategyName = this.config.getString('strategy', 'BagSampling');
        this.strategy = this._initializeStrategy(strategyName);
        this.rules = rules;
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    _initializeStrategy(strategyName) {
        return new (STRATEGIES[strategyName] || BagSamplingStrategy)();
    }

    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return errorHandler.handle(new Error(`Focus set must be an array, received: ${typeof focusSet}`), 'performInference', []);
        }

        const maxDerivedTasks = options.maxDerivedTasks ?? Infinity;
        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`);

        const symbolicTasks = this._performSymbolicInference(focusSet, maxDerivedTasks);
        let temporalTasks = [];
        if (symbolicTasks.length < maxDerivedTasks) {
            temporalTasks = this._performTemporalInference(focusSet);
        }
        const finalTasks = [...symbolicTasks, ...temporalTasks].slice(0, maxDerivedTasks);

        debug(`Total inference produced ${finalTasks.length} derived tasks`);
        return finalTasks;
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

            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerivedTasks) break;
                if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
                    debug(`Skipping invalid combination for rule ${rule.name}`);
                    continue;
                }

                const derived = this._applyRule(rule, tasks, processedCombinations);
                if (derived) derivedTasks.push(derived);
            }
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
        const combinationKey = getCombinationKey(rule.name, tasks);
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
        if (!rule.operands) {
            return true;
        }
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
