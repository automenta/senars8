import Task from '../../core/Task.js';
import {isBelief} from '../../utils/task-utils.js';
import {parseTerm, validateTermKey} from '../../parser/parse-utils.js';
import Term from '../../core/Term.js';
import {debug, error as logError} from '../../utils/logger.js';
import {createModuleErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('rule-factories');

/**
 * Parses a task to extract its term structure
 * @param {Task} task - The task to parse
 * @returns {object|null} The parsed term structure or null if parsing fails
 */
function parseTaskTerm(task) {
    return errorHandler.safeSync(() => {
        // If it's a Term object, get its parsed structure
        if (task.term && typeof task.term._getStructure === 'function') {
            const structure = task.term._getStructure();
            return structure && structure.type ? structure : null;
        }
        // Otherwise, use the term directly
        return task.term;
    }, 'parseTaskTerm', null);
}

/**
 * Validates that all parsed tasks are valid
 * @param {Array} parsedTasks - Array of parsed tasks
 * @returns {boolean} True if all tasks are valid
 */
function validateParsedTasks(parsedTasks) {
    return !parsedTasks.some(task => {
        const isInvalid = task === null || task === undefined;
        if (isInvalid) debug('Invalid parsed task found:', task);
        return isInvalid;
    });
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
    // Validate required parameters
    if (!spec.name || typeof spec.name !== 'string') {
        throw new Error('Rule specification must include a valid name');
    }

    if (!spec.arity || typeof spec.arity !== 'number' || spec.arity < 1) {
        throw new Error(`Rule ${spec.name}: Rule specification must include a valid arity (positive number)`);
    }

    if (!Array.isArray(spec.operands)) {
        throw new Error(`Rule ${spec.name}: Rule specification must include an array of operand validators`);
    }

    if (typeof spec.condition !== 'function') {
        throw new Error(`Rule ${spec.name}: Rule specification must include a condition function`);
    }

    if (typeof spec.action !== 'function') {
        throw new Error(`Rule ${spec.name}: Rule specification must include an action function`);
    }

    // Validate operands array length matches arity
    if (spec.operands.length !== spec.arity) {
        throw new Error(`Rule ${spec.name}: Number of operand validators (${spec.operands.length}) must match rule arity (${spec.arity})`);
    }

    return {
        name: spec.name,
        arity: spec.arity,
        operands: spec.operands,
        description: spec.description || `Rule for ${spec.name}`,

        /**
         * Checks if the rule can be applied to the given tasks
         * @param {...Task} tasks - The tasks to check
         * @returns {boolean} True if the rule can be applied
         */
        condition: (...tasks) => errorHandler.safeSync(() => {
            // Basic validation
            if (tasks.length !== spec.arity) {
                debug(`Rule ${spec.name}: Incorrect number of tasks. Expected ${spec.arity}, got ${tasks.length}`);
                return false;
            }

            // Parse tasks
            const parsedTasks = tasks.map(parseTaskTerm);
            if (!validateParsedTasks(parsedTasks)) {
                debug(`Rule ${spec.name}: Failed to parse tasks`);
                return false;
            }

            // Apply rule-specific condition
            const result = spec.condition(...parsedTasks);
            debug(`Rule ${spec.name}: Condition check result: ${result}`);
            return Boolean(result);
        }, `condition-check-${spec.name}`, false),

        /**
         * Applies the rule to the given tasks and generates a new task
         * @param {...Task} tasks - The tasks to apply the rule to
         * @returns {Task|null} The resulting task or null if the rule cannot be applied
         */
        action: (...tasks) => errorHandler.safeSync(() => {
            // Basic validation
            if (tasks.length !== spec.arity) {
                logError(`Rule ${spec.name}: Incorrect number of tasks. Expected ${spec.arity}, got ${tasks.length}`);
                return null;
            }

            // Parse tasks
            const parsedTasks = tasks.map(parseTaskTerm);
            if (!validateParsedTasks(parsedTasks)) {
                logError(`Rule ${spec.name}: Failed to parse tasks`);
                return null;
            }

            // Apply rule action
            const result = spec.action(...parsedTasks, ...tasks);
            if (!result) {
                debug(`Rule ${spec.name}: Action returned no result`);
                return null;
            }

            const {newTermKey, newTruthValue} = result;

            // Validate term key
            if (!newTermKey || typeof newTermKey !== 'string') {
                logError(`Rule ${spec.name}: Term builder must return a string, got ${typeof newTermKey}`);
                return null;
            }

            if (!validateTermKey(newTermKey)) {
                logError(`Rule ${spec.name}: Invalid term key generated: ${newTermKey}`);
                return null;
            }

            // Parse the new term
            const parsedTerm = parseTerm(newTermKey);

            if (!parsedTerm) {
                logError(`Rule ${spec.name}: Parsing generated term key returned null: ${newTermKey}`);
                return null;
            }

            // Validate truth value
            if (!newTruthValue ||
                typeof newTruthValue.frequency !== 'number' ||
                typeof newTruthValue.confidence !== 'number') {
                logError(`Rule ${spec.name}: Invalid truth value generated:`, newTruthValue);
                return null;
            }

            // Validate truth value ranges
            if (newTruthValue.frequency < 0 || newTruthValue.frequency > 1) {
                logError(`Rule ${spec.name}: Frequency must be between 0 and 1, got ${newTruthValue.frequency}`);
                return null;
            }

            if (newTruthValue.confidence < 0 || newTruthValue.confidence > 1) {
                logError(`Rule ${spec.name}: Confidence must be between 0 and 1, got ${newTruthValue.confidence}`);
                return null;
            }

            // Create and return new task
            const newTask = new Task(parsedTerm, '.', newTruthValue);
            debug(`Rule ${spec.name}: Successfully created new task: ${newTask.toString()}`);
            return newTask;
        }, `action-${spec.name}`, null)
    };
}

/**
 * Creates a binary inheritance rule for comparing two inheritance statements
 * @param {string} name - The name of the rule
 * @param {Function} termBuilder - Function to build the resulting term
 * @param {Function} truthValueFunction - Function to calculate the resulting truth value
 * @returns {object} The created inference rule
 */
function createBinaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (parsed1, parsed2) => {
            if (parsed1?.type !== 'Inheritance' || parsed2?.type !== 'Inheritance') {
                return false;
            }

            const predicate1 = Term.termKey(parsed1.predicate);
            const predicate2 = Term.termKey(parsed2.predicate);
            const subject1 = Term.termKey(parsed1.subject);
            const subject2 = Term.termKey(parsed2.subject);

            return predicate1 === predicate2 && subject1 !== subject2;
        },
        termBuilder,
        truthValueFunction
    );
}

/**
 * Creates a transitive inheritance rule for chaining inheritance relations
 * @param {string} name - The name of the rule
 * @param {Function} termBuilder - Function to build the resulting term
 * @param {Function} truthValueFunction - Function to calculate the resulting truth value
 * @returns {object} The created inference rule
 */
function createTransitiveInheritanceRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (parsed1, parsed2) => {
            // Validate both terms are inheritance relations
            if (parsed1?.type !== 'Inheritance' || parsed2?.type !== 'Inheritance') {
                return false;
            }

            // Check if the predicate of the first matches the subject of the second
            const predicate1 = Term.termKey(parsed1.predicate);
            const subject2 = Term.termKey(parsed2.subject);

            return predicate1 === subject2;
        },
        termBuilder,
        truthValueFunction
    );
}

/**
 * Creates a unary inheritance rule for transforming a single inheritance statement
 * @param {string} name - The name of the rule
 * @param {Function} termBuilder - Function to build the resulting term
 * @param {Function} truthValueFunction - Function to calculate the resulting truth value
 * @returns {object} The created inference rule
 */
function createUnaryInheritanceRule(name, termBuilder, truthValueFunction) {
    return createUnaryRule(
        name,
        parsed1 => parsed1?.type === 'Inheritance',
        termBuilder,
        truthValueFunction
    );
}

/**
 * Creates a modus ponens rule for implication elimination
 * @param {string} name - The name of the rule
 * @param {Function} termBuilder - Function to build the resulting term
 * @param {Function} truthValueFunction - Function to calculate the resulting truth value
 * @returns {object} The created inference rule
 */
function createModusPonensRule(name, termBuilder, truthValueFunction) {
    return createBinaryRule(
        name,
        (parsed1, parsed2) => {
            // First task must be an implication
            if (parsed1?.type !== 'Implication') {
                return false;
            }

            // Second task must be an atomic term that matches the implication's subject
            if (parsed2?.type !== 'Atomic') {
                return false;
            }

            const subject1 = Term.termKey(parsed1.subject);
            const term2 = Term.termKey(parsed2);

            return subject1 === term2;
        },
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
    if (typeof name !== 'string' || name.length === 0) {
        throw new Error('Rule name must be a non-empty string');
    }

    if (typeof condition !== 'function') {
        throw new Error(`Rule ${name}: Condition must be a function`);
    }

    if (typeof termBuilder !== 'function') {
        throw new Error(`Rule ${name}: Term builder must be a function`);
    }

    if (typeof truthValueFunction !== 'function') {
        throw new Error(`Rule ${name}: Truth value function must be a function`);
    }

    return createRule({
        name,
        arity: 2,
        operands: [isBelief, isBelief],
        condition,
        action: (parsed1, parsed2, task1, task2) => ({
            newTermKey: termBuilder(parsed1, parsed2),
            newTruthValue: truthValueFunction(task1.state.truthValue, task2.state.truthValue)
        })
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
    if (typeof name !== 'string' || name.length === 0) {
        throw new Error('Rule name must be a non-empty string');
    }

    if (typeof condition !== 'function') {
        throw new Error(`Rule ${name}: Condition must be a function`);
    }

    if (typeof termBuilder !== 'function') {
        throw new Error(`Rule ${name}: Term builder must be a function`);
    }

    if (typeof truthValueFunction !== 'function') {
        throw new Error(`Rule ${name}: Truth value function must be a function`);
    }

    return createRule({
        name,
        arity: 1,
        operands: [isBelief],
        condition,
        action: (parsed1, task1) => ({
            newTermKey: termBuilder(parsed1),
            newTruthValue: truthValueFunction(task1.state.truthValue)
        })
    });
}

export {
    createRule,
    createUnaryRule,
    createBinaryRule,
    createBinaryInheritanceRule,
    createTransitiveInheritanceRule,
    createUnaryInheritanceRule,
    createModusPonensRule
};
