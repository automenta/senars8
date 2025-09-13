import BagSamplingStrategy from './strategies/BagSamplingStrategy.js';
import rules from './rules/index.js';
import TemporalReasoner from './TemporalReasoner.js';
import {debug, error as logError, info} from '../utils/logger.js';
import {handleError} from '../utils/error-handler.js';

class Reasoner {
    constructor({strategy = new BagSamplingStrategy(), temporalReasoner = new TemporalReasoner()} = {}) {
        this.strategy = strategy;
        this.rules = rules;
        this.temporalReasoner = temporalReasoner;
        info('Reasoner initialized with strategy:', this.strategy.constructor.name);
    }

    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return handleError(new Error('Focus set must be an array'), 'Reasoner.performInference', false);
        }

        const {maxDerivedTasks = Infinity} = options;
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

    _performSymbolicInference(focusSet, maxDerivedTasks) {
        let derivedTasks = [];
        const processedCombinations = new Set();

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) break;
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

    _applyRuleToCombinations(rule, focusSet, processedCombinations, maxDerivedTasks) {
        const derivedTasks = [];
        try {
            const combinations = this.strategy.selectCombinations(focusSet, rule.arity);
            for (const tasks of combinations) {
                if (derivedTasks.length >= maxDerivedTasks) break;
                if (!Array.isArray(tasks) || tasks.length !== rule.arity) continue;

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

    _applyRule(rule, tasks, processedCombinations) {
        if (!rule || !Array.isArray(tasks) || !processedCombinations) {
            return handleError(new Error('Invalid arguments to _applyRule'), '_applyRule validation', false);
        }

        const taskIds = tasks.map(task => task.id).sort();
        const combinationKey = `${rule.name}:${taskIds.join(',')}`;

        if (processedCombinations.has(combinationKey)) return null;
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
                acc[arity] = acc[arity] || [];
                acc[arity].push(rule.name);
                return acc;
            }, {}),
        };
    }
}

export default Reasoner;
