import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import Term from '../../core/Term.js';

function parseTaskTerm(task) {
    try {
        // If it's a Term object, get its parsed structure
        if (task.term && typeof task.term._getStructure === 'function') {
            const structure = task.term._getStructure();
            return structure && structure.type ? structure : null;
        }
        // Otherwise, use the term directly
        return task.term;
    } catch (error) {
        return null;
    }
}

function validateTermKey(termKey) {
    // Validate the generated term key before parsing
    if (!termKey || typeof termKey !== 'string' || termKey.length === 0) {
        return false;
    }

    // Additional validation to catch invalid term keys that would cause parsing errors
    return !(termKey.includes('( --> )') || termKey.includes('( ==> )') ||
        termKey.includes('( <-> )') || termKey.includes('( <=> )'));
}

/**
 * A generic factory for creating inference rules.
 * This function abstracts the common logic of parsing tasks, validating conditions,
 * and creating the resulting Task object.
 *
 * @param {object} spec - The specification for the rule.
 * @param {string} spec.name - The name of the rule.
 * @param {number} spec.arity - The number of tasks the rule takes as input.
 * @param {Array<Function>} spec.operands - An array of functions to validate the input tasks.
 * @param {Function} spec.condition - A function that checks if the rule can be applied to the parsed tasks.
 * @param {Function} spec.action - A function that performs the inference and returns the new term and truth value.
 * @returns {object} The created inference rule.
 */
function createRule(spec) {
    return {
        name: spec.name,
        arity: spec.arity,
        operands: spec.operands,
        condition: (...tasks) => {
            try {
                const parsedTasks = tasks.map(parseTaskTerm);
                if (parsedTasks.some(task => task === null)) {
                    return false;
                }
                return spec.condition(...parsedTasks);
            } catch (error) {
                return false;
            }
        },
        action: (...tasks) => {
            try {
                const parsedTasks = tasks.map(parseTaskTerm);
                if (parsedTasks.some(task => task === null)) {
                    return null;
                }

                const result = spec.action(...parsedTasks, ...tasks);
                if (!result) return null;

                const {
                    newTermKey,
                    newTruthValue
                } = result;

                if (!validateTermKey(newTermKey)) {
                    return null;
                }

                let parsedTerm;
                try {
                    parsedTerm = parseTerm(newTermKey);
                } catch (error) {
                    return null;
                }

                if (!parsedTerm) {
                    return null;
                }

                return new Task(parsedTerm, '.', newTruthValue);
            } catch (error) {
                return null;
            }
        },
    };
}

function createBinaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (parsed1, parsed2) =>
            parsed1?.type === 'Inheritance' &&
            parsed2?.type === 'Inheritance' &&
            Term.buildTermKey(parsed1.predicate) === Term.buildTermKey(parsed2.predicate) &&
            Term.buildTermKey(parsed1.subject) !== Term.buildTermKey(parsed2.subject),
        termBuilder,
        truthValueFunction
    );
}

function createTransitiveInheritanceRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (parsed1, parsed2) =>
            parsed1?.type === 'Inheritance' &&
            parsed2?.type === 'Inheritance' &&
            Term.buildTermKey(parsed1.predicate) === Term.buildTermKey(parsed2.subject),
        termBuilder,
        truthValueFunction
    );
}

function createUnaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createUnaryRule(
        name,
        (parsed1) => parsed1?.type === 'Inheritance',
        termBuilder,
        truthValueFunction
    );
}

function createModusPonensRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (parsed1, parsed2) =>
            parsed1?.type === 'Implication' &&
            parsed2?.type === 'Atomic' &&
            Term.buildTermKey(parsed1.subject) === Term.buildTermKey(parsed2),
        termBuilder,
        truthValueFunction
    );
}

/**
 * Creates a generic binary inference rule.
 * @param {string} name - The name of the rule.
 * @param {Function} condition - The condition function to check against the parsed terms.
 * @param {Function} termBuilder - A function to build the new term key.
 * @param {Function} truthValueFunction - A function to calculate the new truth value.
 * @returns {object} The created inference rule.
 */
function createBinaryRule(name, condition, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 2,
        operands: [Task.isBelief, Task.isBelief],
        condition,
        action: (parsed1, parsed2, task1, task2) => ({
            newTermKey: termBuilder(parsed1, parsed2),
            newTruthValue: truthValueFunction(task1.state.truthValue, task2.state.truthValue),
        }),
    });
}

/**
 * Creates a generic unary inference rule.
 * @param {string} name - The name of the rule.
 * @param {Function} condition - The condition function to check against the parsed term.
 * @param {Function} termBuilder - A function to build the new term key.
 * @param {Function} truthValueFunction - A function to calculate the new truth value.
 * @returns {object} The created inference rule.
 */
function createUnaryRule(name, condition, termBuilder, truthValueFunction) {
    return createRule({
        name,
        arity: 1,
        operands: [Task.isBelief],
        condition,
        action: (parsed1, task1) => ({
            newTermKey: termBuilder(parsed1),
            newTruthValue: truthValueFunction(task1.state.truthValue),
        }),
    });
}

export {
    createRule,
    createUnaryRule,
    createBinaryRule,
    createBinaryInheritanceRule,
    createTransitiveInheritanceRule,
    createUnaryInheritanceRule,
    createModusPonensRule,
};
