import Validator from './Validator.js';

/**
 * Enhanced validation utility that provides a more concise interface
 * for common validation patterns across the system
 */
class Validation {
    /**
     * Validate that a value is a non-empty string
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static string(value, name = 'Value') {
        Validator.validateString(value, name);
    }

    /**
     * Validate that a value is a non-empty array
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static nonEmptyArray(value, name = 'Value') {
        Validator.validateNonEmptyArray(value, name);
    }

    /**
     * Validate that a value is an array
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static array(value, name = 'Value') {
        Validator.validateArray(value, name);
    }

    /**
     * Validate that a value is a valid object
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static object(value, name = 'Value') {
        Validator.validateObject(value, name);
    }

    /**
     * Validate that a value is a valid Task instance
     * @param {*} value - Value to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static task(value, name = 'Value') {
        Validator.validateTask(value, name);
    }

    /**
     * Validate that a value is a valid Term
     * @param {*} term - Term to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static term(term, name = 'Term') {
        Validator.validateTerm(term, name);
    }

    /**
     * Validate that a value is valid punctuation
     * @param {*} punctuation - Punctuation to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static punctuation(punctuation, name = 'Punctuation') {
        Validator.validatePunctuation(punctuation, name);
    }

    /**
     * Validate that a value is a valid truth value
     * @param {*} truthValue - Truth value to validate
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If validation fails
     */
    static truthValue(truthValue, name = 'TruthValue') {
        Validator.validateTruthValue(truthValue, name);
    }

    /**
     * Validate a value with a custom validator function
     * @param {*} value - Value to validate
     * @param {Function} validator - Validation function that returns true/false
     * @param {string} errorMessage - Error message if validation fails
     * @throws {Error} If validation fails
     */
    static with(value, validator, errorMessage) {
        Validator.validateWith(value, validator, errorMessage);
    }

    /**
     * Conditional validation - only validate if condition is true
     * @param {boolean} condition - Condition to check
     * @param {Function} validator - Validation function to execute if condition is true
     */
    static conditional(condition, validator) {
        if (condition) validator();
    }

    /**
     * Validate multiple values at once
     * @param {Array} validations - Array of validation objects {value, validator, name}
     */
    static all(validations) {
        validations.forEach(({value, validator, name}) => {
            if (typeof validator === 'string') {
                // Use built-in validators
                const validatorFn = this[validator];
                if (validatorFn) {
                    validatorFn(value, name);
                } else {
                    throw new Error(`Unknown validator: ${validator}`);
                }
            } else if (typeof validator === 'function') {
                // Use custom validator function
                validator(value, name);
            }
        });
    }
}

export {Validation};