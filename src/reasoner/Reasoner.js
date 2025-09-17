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
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    _initializeStrategy(strategyName) {
        const StrategyClass = STRATEGIES[strategyName] || BagSamplingStrategy;
        return new StrategyClass();
    }

    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            const error = new Error(`Focus set must be an array, received: ${typeof focusSet}`);
            return errorHandler.handle(error, 'performInference', []);
        }

        const {
            maxDerivedTasks = Infinity
        } = options;
        debug(`Performing inference on ${focusSet.length} tasks with max ${maxDerivedTasks} derived tasks`, { module: 'reasoner/Reasoner' });

        const derivedTasks = this._performSymbolicInference(focusSet, maxDerivedTasks);

        if (derivedTasks.length < maxDerivedTasks) {
            const temporalTasks = this._performTemporalInference(focusSet);
            derivedTasks.push(...temporalTasks);
        }

        const finalTasks = derivedTasks.slice(0, maxDerivedTasks);
        debug(`Total inference produced ${finalTasks.length} derived tasks`, { module: 'reasoner/Reasoner' });
        return finalTasks;
    }

    _performSymbolicInference(focusSet, maxDerivedTasks) {
        const derivedTasks = [];
        const processedCombinations = new Set();

        debug(`Starting symbolic inference with ${this.rules.length} rules`, { module: 'reasoner/Reasoner' });

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) {
                debug(`Reached maximum derived tasks limit of ${maxDerivedTasks}`, { module: 'reasoner/Reasoner' });
                break;
            }
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity: ${rule.arity}`, { module: 'reasoner/Reasoner' });
                continue;
            }
            const newTasks = this._applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks - derivedTasks.length);
            derivedTasks.push(...newTasks);
            if (newTasks.length > 0) {
                debug(`Rule ${rule.name} produced ${newTasks.length} new tasks`, { module: 'reasoner/Reasoner' });
            }
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`, { module: 'reasoner/Reasoner' });
        return derivedTasks;
    }

    _applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks) {
        return errorHandler.safeSync(() => {
            const derivedTasks = [];
            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            debug(`Rule ${rule.name} selected ${combinations.length} combinations to process`, { module: 'reasoner/Reasoner' });

            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerivedTasks) {
                    debug(`Reached maximum derived tasks limit of ${maxDerivedTasks} for rule ${rule.name}`, { module: 'reasoner/Reasoner' });
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
            return derivedTasks;
        }, `applyRuleToCombinations for rule ${rule.name}`, []);
    }

    _performTemporalInference(focusSet) {
        return errorHandler.safeSync(() => {
            debug(`Starting temporal inference on ${focusSet.length} tasks`, { module: 'reasoner/Reasoner' });
            const temporalTasks = this.temporalReasoner.infer(focusSet);
            if (Array.isArray(temporalTasks)) {
                debug(`Temporal inference produced ${temporalTasks.length} derived tasks`, { module: 'reasoner/Reasoner' });
                return temporalTasks;
            }
            debug('Temporal inference returned invalid result, expected array');
            return [];
        }, 'performTemporalInference', []);
    }

    _applyRule(rule, tasks, processedCombinations) {
        if (!rule || !Array.isArray(tasks) || !processedCombinations) {
            const error = new Error('Invalid arguments to _applyRule');
            return errorHandler.handle(error, '_applyRule validation', null);
        }

        const taskIds = tasks.map(task => task.id).sort();
        const combinationKey = `${rule.name}:${taskIds.join(',')}`;

        if (processedCombinations.has(combinationKey)) {
            debug(`Skipping already processed combination for rule ${rule.name}`, { module: 'reasoner/Reasoner' });
            return null;
        }
        processedCombinations.add(combinationKey);

        return errorHandler.safeSync(() => {
            if (this._areOperandsValid(rule, tasks) && rule.condition(...tasks)) {
                const result = rule.action(...tasks);
                debug(`Rule ${rule.name} ${result ? 'applied successfully' : 'action returned null/undefined'}`, { module: 'reasoner/Reasoner' });
                return result;
            }
            debug(`Rule ${rule.name} condition not met`, { module: 'reasoner/Reasoner' });
            return null;
        }, `applyRule for rule ${rule.name}`, null);
    }

    _areOperandsValid(rule, tasks) {
        if (!rule?.operands || !Array.isArray(tasks) || tasks.length !== rule.operands.length) {
            return false;
        }

        return tasks.every((task, i) =>
            errorHandler.safeSync(() => {
                const validator = rule.operands[i];
                if (typeof validator !== 'function') {
                    logError(`Operand validator at index ${i} for rule ${rule.name} is not a function.`);
                    return false;
                }
                const isValid = validator(task);
                if (!isValid) {
                    debug(`Task at index ${i} failed validation for rule ${rule.name}`, { module: 'reasoner/Reasoner' });
                }
                return isValid;
            }, `areOperandsValid for rule ${rule.name} at index ${i}`, false)
        );
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
            }, {})
        };
    }
}

export default Reasoner;
