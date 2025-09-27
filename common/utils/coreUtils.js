import {createUnifiedErrorHandler} from '../../core/utils/errorHandler.js';
import {parseTerm} from '../../core/parser/parse-utils.js';
import {Task} from '../../core/index.js';

// Create a unified error handler for utility functions
const utilErrorHandler = createUnifiedErrorHandler('CoreUtils');

/**
 * Validates a Narsese statement.
 * @param {string} statement - The statement to validate.
 * @returns {{valid: boolean, parsed: object|null, error: string|null}}
 */
export const validateNarseseStatement = (statement) => {
    if (!statement || typeof statement !== 'string') {
        return {valid: false, error: 'Statement must be a non-empty string'};
    }

    const trimmed = statement.trim();
    if (!trimmed) {
        return {valid: false, error: 'Statement cannot be empty after trimming'};
    }

    try {
        const parsed = parseTerm(trimmed);
        return {
            valid: !!parsed,
            parsed: parsed,
            error: parsed ? null : 'Failed to parse statement'
        };
    } catch (error) {
        return {valid: false, error: error.message};
    }
};

/**
 * Creates a Task object from a Narsese statement.
 * @param {string} statement - The Narsese statement.
 * @param {string} [punctuation='.'] - The punctuation for the task.
 * @param {number} [priority=0.5] - The priority of the task.
 * @returns {Task} The created Task object.
 */
export const createTaskFromStatement = (statement, punctuation = '.', priority = 0.5) => {
    try {
        const validation = validateNarseseStatement(statement);
        if (!validation.valid) {
            throw new Error(`Invalid statement: ${validation.error}`);
        }

        return new Task(validation.parsed, punctuation, {priority});
    } catch (error) {
        utilErrorHandler(error, 'createTaskFromStatement');
        throw error;
    }
};