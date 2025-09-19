/**
 * Utility for simplifying complex conditional logic with abstract patterns
 */

/**
 * A utility class for handling complex conditional logic with simplified patterns
 */
class ConditionalLogic {
    /**
     * Simplifies complex if-else chains with a mapping approach
     * @param {*} value - The value to evaluate
     * @param {Object} conditions - Map of conditions to results
     * @param {*} defaultValue - Default value if no conditions match
     * @returns {*} Result based on matching condition or default value
     */
    static switch(value, conditions, defaultValue = null) {
        if (conditions.hasOwnProperty(value)) {
            const result = conditions[value];
            return typeof result === 'function' ? result() : result;
        }
        return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }

    /**
     * Simplifies complex validation chains with early returns
     * @param {Array} validators - Array of validator functions that return { valid: boolean, error?: string }
     * @returns {Object} Validation result { valid: boolean, error?: string }
     */
    static validateAll(validators) {
        for (const validator of validators) {
            const result = validator();
            if (!result.valid) {
                return result;
            }
        }
        return { valid: true };
    }

    /**
     * Simplifies complex nested conditionals with a fluent interface
     * @param {*} initialValue - Initial value to evaluate
     */
    static when(initialValue) {
        return new ConditionalChain(initialValue);
    }

    /**
     * Simplifies range checking
     * @param {number} value - Value to check
     * @param {number} min - Minimum value (inclusive)
     * @param {number} max - Maximum value (inclusive)
     * @param {*} defaultValue - Default value if out of range
     * @returns {*} Value if in range, otherwise default value
     */
    static inRange(value, min, max, defaultValue = null) {
        return (value >= min && value <= max) ? value : defaultValue;
    }

    /**
     * Simplifies type checking with a fluent interface
     * @param {*} value - Value to check
     * @returns {TypeChecker} Type checker instance
     */
    static is(value) {
        return new TypeChecker(value);
    }

    /**
     * Simplifies null/undefined checking
     * @param {*} value - Value to check
     * @param {*} defaultValue - Default value if null/undefined
     * @returns {*} Value if not null/undefined, otherwise default value
     */
    static nullish(value, defaultValue) {
        return (value !== null && value !== undefined) ? value : defaultValue;
    }

    /**
     * Simplifies array checking
     * @param {*} value - Value to check
     * @param {Function} callback - Function to call if value is array
     * @param {*} defaultValue - Default value if not array
     * @returns {*} Result of callback if array, otherwise default value
     */
    static ifArray(value, callback, defaultValue = null) {
        return Array.isArray(value) ? callback(value) : defaultValue;
    }

    /**
     * Simplifies object checking
     * @param {*} value - Value to check
     * @param {Function} callback - Function to call if value is object
     * @param {*} defaultValue - Default value if not object
     * @returns {*} Result of callback if object, otherwise default value
     */
    static ifObject(value, callback, defaultValue = null) {
        return (typeof value === 'object' && value !== null && !Array.isArray(value)) ? 
            callback(value) : defaultValue;
    }
}

/**
 * Fluent interface for complex conditional chains
 */
class ConditionalChain {
    constructor(value) {
        this.value = value;
        this.result = null;
        this.completed = false;
    }

    /**
     * Check if value equals a specific value
     * @param {*} checkValue - Value to compare against
     * @param {*} result - Result if condition is true
     * @returns {ConditionalChain} This chain for chaining
     */
    equals(checkValue, result) {
        if (this.completed) return this;
        if (this.value === checkValue) {
            this.result = typeof result === 'function' ? result(this.value) : result;
            this.completed = true;
        }
        return this;
    }

    /**
     * Check if value matches a condition function
     * @param {Function} condition - Function that returns true/false
     * @param {*} result - Result if condition is true
     * @returns {ConditionalChain} This chain for chaining
     */
    when(condition, result) {
        if (this.completed) return this;
        if (condition(this.value)) {
            this.result = typeof result === 'function' ? result(this.value) : result;
            this.completed = true;
        }
        return this;
    }

    /**
     * Default result if no previous conditions matched
     * @param {*} result - Default result
     * @returns {ConditionalChain} This chain for chaining
     */
    otherwise(result) {
        if (!this.completed) {
            this.result = typeof result === 'function' ? result(this.value) : result;
            this.completed = true;
        }
        return this;
    }

    /**
     * Get the final result
     * @returns {*} Final result
     */
    getResult() {
        return this.result;
    }
}

/**
 * Fluent interface for type checking
 */
class TypeChecker {
    constructor(value) {
        this.value = value;
    }

    /**
     * Check if value is a string
     * @param {Function} callback - Function to call if value is string
     * @returns {*} Result of callback or this for chaining
     */
    string(callback) {
        if (typeof this.value === 'string') {
            return callback ? callback(this.value) : true;
        }
        return callback ? null : this;
    }

    /**
     * Check if value is a number
     * @param {Function} callback - Function to call if value is number
     * @returns {*} Result of callback or this for chaining
     */
    number(callback) {
        if (typeof this.value === 'number') {
            return callback ? callback(this.value) : true;
        }
        return callback ? null : this;
    }

    /**
     * Check if value is a boolean
     * @param {Function} callback - Function to call if value is boolean
     * @returns {*} Result of callback or this for chaining
     */
    boolean(callback) {
        if (typeof this.value === 'boolean') {
            return callback ? callback(this.value) : true;
        }
        return callback ? null : this;
    }

    /**
     * Check if value is an array
     * @param {Function} callback - Function to call if value is array
     * @returns {*} Result of callback or this for chaining
     */
    array(callback) {
        if (Array.isArray(this.value)) {
            return callback ? callback(this.value) : true;
        }
        return callback ? null : this;
    }

    /**
     * Check if value is an object
     * @param {Function} callback - Function to call if value is object
     * @returns {*} Result of callback or this for chaining
     */
    object(callback) {
        if (typeof this.value === 'object' && this.value !== null && !Array.isArray(this.value)) {
            return callback ? callback(this.value) : true;
        }
        return callback ? null : this;
    }

    /**
     * Check if value is null or undefined
     * @param {Function} callback - Function to call if value is null/undefined
     * @returns {*} Result of callback or this for chaining
     */
    nullish(callback) {
        if (this.value === null || this.value === undefined) {
            return callback ? callback(this.value) : true;
        }
        return callback ? null : this;
    }
}

export default ConditionalLogic;