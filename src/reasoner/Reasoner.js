import BagSamplingStrategy from './strategies/BagSamplingStrategy.js';
import BruteForceStrategy from './strategies/BruteForceStrategy.js';
import rules from './rules/index.js';
import TemporalReasoner from './TemporalReasoner.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('Reasoner');

const STRATEGIES = {
    BruteForce: BruteForceStrategy,
    BagSampling: BagSamplingStrategy,
};

class Reasoner {
    constructor({
                    temporalReasoner
                } = {}, configManager) {
        this.configManager = configManager;
        this.temporalReasoner = temporalReasoner || new TemporalReasoner(configManager);
        const strategyName = this.configManager.getString('reasoner.strategy', 'BagSampling');
        this.strategy = this._initializeStrategy(strategyName);
        this.rules = rules;
        info(`Initialized with ${this.strategy.constructor.name} strategy.`);
    }

    _initializeStrategy(strategyName) {
        const StrategyClass = STRATEGIES[strategyName] || BagSamplingStrategy;
        return new StrategyClass();
    }

    performInference(focusSet, {
        maxDerivedTasks = Infinity
    } = {}) {
        if (!Array.isArray(focusSet)) {
            return errorHandler.handle(new Error(`Focus set must be an array, received: ${typeof focusSet}`), 'performInference', []);
        }
        debug(`Performing inference on ${focusSet.length} tasks, max derived: ${maxDerivedTasks}`);

        const symbolicTasks = this._performSymbolicInference(focusSet, maxDerivedTasks);
        const remainingCapacity = maxDerivedTasks - symbolicTasks.length;
        const temporalTasks = remainingCapacity > 0 ? this._performTemporalInference(focusSet) : [];

        const finalTasks = [...symbolicTasks, ...temporalTasks].slice(0, maxDerivedTasks);
        debug(`Inference produced ${finalTasks.length} derived tasks.`);
        return finalTasks;
    }

    _performSymbolicInference(focusSet, maxDerivedTasks) {
        const derivedTasks = [];
        const processedCombinations = new Set();
        debug(`Starting symbolic inference with ${this.rules.length} rules.`);

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) break;
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} with invalid arity: ${rule.arity}`);
                continue;
            }
            const newTasks = this._applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks - derivedTasks.length);
            if (newTasks.length > 0) {
                derivedTasks.push(...newTasks);
                debug(`Rule ${rule.name} produced ${newTasks.length} new tasks.`);
            }
        }
        debug(`Symbolic inference produced ${derivedTasks.length} tasks.`);
        return derivedTasks;
    }

    _applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerived) {
        return this._withErrorHandling(`applyRuleToCombinations:${rule.name}`, () => {
            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            debug(`Rule ${rule.name} selected ${combinations.length} combinations.`);
            const derivedTasks = [];
            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerived) break;
                if (!Array.isArray(tasks) || tasks.length !== rule.arity) {
                    debug(`Skipping invalid combination for ${rule.name}.`);
                    continue;
                }
                const derived = this._applyRule(rule, tasks, processedCombinations);
                if (derived) derivedTasks.push(derived);
            }
            return derivedTasks;
        }, []);
    }

    _performTemporalInference(focusSet) {
        return this._withErrorHandling('performTemporalInference', () => {
            debug(`Starting temporal inference on ${focusSet.length} tasks.`);
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            if (!Array.isArray(temporalTasks)) {
                debug('Temporal inference returned invalid result.');
                return [];
            }
            debug(`Temporal inference produced ${temporalTasks.length} tasks.`);
            return temporalTasks;
        }, []);
    }

    _applyRule(rule, tasks, processedCombinations) {
        if (!rule || !tasks || !processedCombinations) {
            return errorHandler.handle(new Error('Invalid args to _applyRule'), '_applyRule validation', null);
        }
        const combinationKey = `${rule.name}:${tasks.map(t => t.id).sort().join(',')}`;
        if (processedCombinations.has(combinationKey)) {
            debug(`Skipping processed combination for ${rule.name}.`);
            return null;
        }
        processedCombinations.add(combinationKey);

        return this._withErrorHandling(`applyRule:${rule.name}`, () => {
            if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
                const result = rule.action(...tasks);
                debug(`Rule ${rule.name} ${result ? 'applied' : 'condition not met'}.`);
                return result;
            }
            return null;
        }, null);
    }

    _areOperandsValid(rule, tasks) {
        return rule?.operands?.every((validator, i) =>
            this._withErrorHandling(`areOperandsValid:${rule.name}:${i}`, () => {
                if (typeof validator !== 'function') {
                    logError(`Validator at index ${i} for ${rule.name} is not a function.`);
                    return false;
                }
                const isValid = validator(tasks[i]);
                if (!isValid) debug(`Task at index ${i} failed validation for ${rule.name}.`);
                return isValid;
            }, false)
        ) ?? false;
    }

    _withErrorHandling(operation, fn, defaultValue) {
        return errorHandler.safeSync(fn, operation, defaultValue);
    }

    getRuleNames() {
        return this.rules.map(rule => rule.name);
    }

    getRule(name) {
        return this.rules.find(rule => rule.name === name) || null;
    }

    getRuleStatistics() {
        return {
            totalRules: this.rules.length,
            ruleNames: this.getRuleNames(),
            rulesByArity: this.rules.reduce((acc, rule) => {
                const arity = rule.arity || 0;
                (acc[arity] = acc[arity] || []).push(rule.name);
                return acc;
            }, {}),
        };
    }
}

export default Reasoner;
