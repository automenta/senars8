const BagSamplingStrategy = require('./strategies/BagSamplingStrategy');
const rules = require('./rules');
const TemporalReasoner = require('./TemporalReasoner');
const {info, debug} = require('../utils/logger');
const {handleErrorWithDefault} = require('../utils/error-handler');

class Reasoner {
    constructor(strategy = new BagSamplingStrategy()) {
        this.strategy = strategy;
        this.rules = rules;
        this.temporalReasoner = new TemporalReasoner();
        info('Reasoner initialized with strategy:', strategy.constructor.name);
    }

    performInference(focusSet, options = {}) {
        if (!Array.isArray(focusSet)) {
            return handleErrorWithDefault(new Error('Focus set must be an array'), 'Reasoner.performInference', []);
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

    _performSymbolicInference(focusSet, maxDerivedTasks) {
        const derivedTasks = [];
        const processedCombinations = new Set();

        for (const rule of this.rules) {
            if (derivedTasks.length >= maxDerivedTasks) break;
            if (!rule.arity || rule.arity < 1) {
                debug(`Skipping rule ${rule.name} due to invalid arity`);
                continue;
            }
            this._applyRuleToCombinations(rule, focusSet, derivedTasks, processedCombinations, maxDerivedTasks);
        }

        debug(`Symbolic inference produced ${derivedTasks.length} derived tasks`);
        return derivedTasks;
    }

    _applyRuleToCombinations(rule, focusSet, derivedTasks, processedCombinations, maxDerivedTasks) {
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
            handleErrorWithDefault(err, `Error applying rule ${rule.name}`, null);
        }
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
            return handleErrorWithDefault(err, 'Error in temporal inference', []);
        }
    }

    _applyRule(rule, tasks, processedCombinations) {
        if (!rule || !Array.isArray(tasks) || !processedCombinations) {
            return handleErrorWithDefault(new Error('Invalid arguments to _applyRule'), '_applyRule validation', null);
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
            return handleErrorWithDefault(err, `Error applying rule ${rule.name}`, null);
        }
    }

    _areOperandsValid(rule, tasks) {
        if (!rule || !Array.isArray(rule.operands) || !Array.isArray(tasks) || tasks.length !== rule.operands.length) {
            return false;
        }

        return tasks.every((task, index) => {
            const validator = rule.operands[index];
            if (typeof validator !== 'function') {
                handleErrorWithDefault(new Error(`Operand validator at index ${index} is not a function`), `_areOperandsValid rule ${rule.name}`, false);
                return false;
            }
            try {
                return validator(task);
            } catch (err) {
                handleErrorWithDefault(err, `Error validating operand for rule ${rule.name}`, false);
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

module.exports = Reasoner;
