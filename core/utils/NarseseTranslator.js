import {createUnifiedErrorHandler} from './errorHandler.js';
import {error as logError} from './logger.js';
import {OP, PUNCTUATION} from '../config/constants.js';

const errorHandler = createUnifiedErrorHandler('NarseseTranslator');

/**
 * Bidirectional Narsese Translator that bridges symbolic (Narsese) and sub-symbolic (JavaScript) layers.
 * Converts JavaScript tool outputs into Narsese beliefs and extracts arguments from Narsese goals for tool handlers.
 */
class NarseseTranslator {
    constructor() {
        this.errorHandler = errorHandler;
    }

    /**
     * Convert a JavaScript result to a Narsese belief
     * @param {any} result - The result from a JavaScript function/tool
     * @param {string} sourceTerm - The source term that generated this result
     * @param {Object} config - Configuration options
     * @returns {Object} Narsese belief object
     */
    resultToNarseseBelief(result, sourceTerm, config = {}) {
        try {
            if (typeof sourceTerm !== 'string' || !sourceTerm.trim()) {
                throw new Error('Source term must be a non-empty string');
            }

            const {
                frequency = 0.9,
                confidence = 0.9,
                timestamp = Date.now()
            } = config;

            // Validate truth values
            if (typeof frequency !== 'number' || frequency < 0 || frequency > 1) {
                throw new Error('Frequency must be a number between 0 and 1');
            }
            if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
                throw new Error('Confidence must be a number between 0 and 1');
            }

            // Convert result to appropriate Narsese representation based on result type
            let narseseRepresentation;

            if (result === true || result === false) {
                // Boolean result: create a simple belief
                narseseRepresentation = `(${sourceTerm} --> ${result ? 'success' : 'failure'})`;
            } else if (typeof result === 'object' && result !== null) {
                // Object result: convert to key-value pairs or structured representation
                if (result.error) {
                    // Error result
                    narseseRepresentation = `(${sourceTerm} --> error: "${String(result.error).replace(/"/g, "'")}")`;
                } else {
                    // Success with data
                    narseseRepresentation = this._objectToNarsese(sourceTerm, result);
                }
            } else if (typeof result === 'string' || typeof result === 'number') {
                // Simple value result
                narseseRepresentation = `(${sourceTerm} --> ${result})`;
            } else {
                // Other types - convert to string
                narseseRepresentation = `(${sourceTerm} --> "${String(result).replace(/"/g, "'")}")`;
            }

            return {
                term: narseseRepresentation,
                truth: {
                    frequency,
                    confidence
                },
                punctuation: PUNCTUATION.BELIEF,
                occurrenceTime: timestamp
            };
        } catch (error) {
            logError(`NarseseTranslator: Error converting result to Narsese: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract arguments from a Narsese goal for tool execution
     * @param {Object} narseseGoal - The parsed Narsese goal object
     * @returns {Array} Array of arguments extracted from the goal
     */
    extractArgumentsFromGoal(narseseGoal) {
        try {
            if (!narseseGoal || !narseseGoal.term) {
                throw new Error('Invalid Narsese goal: missing term');
            }

            // If the term is an operation, extract arguments from predicate
            if (narseseGoal.term.type === OP.OPERATION) {
                const operation = narseseGoal.term;

                // Extract the operation name (subject)
                const operationName = operation.subject?.key || operation.subject?.name || 'unknown';

                // Extract arguments from predicate (which should be a Product)
                let args = [];
                if (operation.predicate && operation.predicate.type === OP.PRODUCT && operation.predicate.terms) {
                    args = operation.predicate.terms.map(term => this._termToValue(term));
                } else if (operation.predicate) {
                    // Single argument case
                    args = [this._termToValue(operation.predicate)];
                }

                return {
                    operationName,
                    args,
                    subject: operation.subject
                };
            }

            // For other types of goals, return the term itself as a simple goal
            return {
                operationName: null,
                args: [],
                subject: narseseGoal.term
            };
        } catch (error) {
            logError(`NarseseTranslator: Error extracting arguments from goal: ${error.message}`);
            throw error;
        }
    }

    /**
     * Convert a JavaScript result to a Narsese goal
     * @param {string} actionName - Name of the action to achieve
     * @param {Array} args - Arguments for the action
     * @param {Object} config - Configuration options
     * @returns {Object} Narsese goal object
     */
    createNarseseGoal(actionName, args = [], config = {}) {
        try {
            const {
                frequency = 0.9,
                confidence = 0.9,
                timestamp = Date.now()
            } = config;

            // Create a Narsese operation term like: actionName(args)
            let argsStr = '';
            if (args && args.length > 0) {
                argsStr = args.map(arg => this._valueToNarsese(arg)).join(', ');
            }

            const operationStr = `${actionName}(${argsStr})`;

            return {
                term: operationStr,
                truth: {
                    frequency,
                    confidence
                },
                punctuation: PUNCTUATION.GOAL,
                occurrenceTime: timestamp
            };
        } catch (error) {
            logError(`NarseseTranslator: Error creating Narsese goal: ${error.message}`);
            throw error;
        }
    }

    /**
     * Convert a Narsese belief to JavaScript value
     * @param {Object} narseseBelief - The Narsese belief object
     * @returns {any} JavaScript representation of the belief
     */
    narseseToValue(narseseBelief) {
        try {
            if (!narseseBelief || !narseseBelief.term) {
                return null;
            }

            // Parse the term structure to extract meaningful data
            if (typeof narseseBelief.term === 'string') {
                // Simple parsing for string terms
                const matches = narseseBelief.term.match(/\(([^)]+)\)/);
                if (matches && matches[1]) {
                    const content = matches[1];
                    // Simple key-value extraction
                    const parts = content.split(' --> ');
                    if (parts.length === 2) {
                        return {
                            subject: parts[0].trim(),
                            predicate: parts[1].trim()
                        };
                    }
                }
            } else if (typeof narseseBelief.term === 'object') {
                // For parsed term objects, extract relevant information
                return this._termToObject(narseseBelief.term);
            }

            return narseseBelief.term;
        } catch (error) {
            logError(`NarseseTranslator: Error converting Narsese to value: ${error.message}`);
            return null;
        }
    }

    /**
     * Convert an object to Narsese representation
     * @private
     */
    _objectToNarsese(sourceTerm, obj) {
        // Create a compound term for object properties
        const entries = Object.entries(obj);
        if (entries.length === 0) {
            return `(${sourceTerm} --> empty_object)`;
        }

        // For simplicity, just take the first key-value pair or create a compound representation
        if (entries.length === 1) {
            const [key, value] = entries[0];
            return `((${sourceTerm} ${key}) --> ${this._valueToNarsese(value)})`;
        } else {
            // Multiple properties - create a more complex representation
            const predicates = entries.map(([key, value]) =>
                `(${key} ${this._valueToNarsese(value)})`
            ).join(' & ');
            return `(${sourceTerm} --> (${predicates}))`;
        }
    }

    /**
     * Convert a JavaScript value to Narsese format
     * @private
     */
    _valueToNarsese(value) {
        if (typeof value === 'string') {
            return value.includes(' ') ? `"${value}"` : value;
        } else if (typeof value === 'number') {
            return String(value);
        } else if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        } else if (Array.isArray(value)) {
            return `(${value.map(v => this._valueToNarsese(v)).join(', ')})`;
        } else if (value === null) {
            return 'null';
        } else if (typeof value === 'object') {
            // For objects, convert to a simple string representation
            return JSON.stringify(value).replace(/"/g, "'");
        }
        return String(value);
    }

    /**
     * Convert a term object to a JavaScript value
     * @private
     */
    _termToValue(term) {
        if (!term) return null;

        switch (term.type) {
            case OP.ATOMIC:
                return term.key || term.name;
            case OP.NUMBER:
                return term.value;
            case OP.PRODUCT:
                if (Array.isArray(term.terms)) {
                    return term.terms.map(t => this._termToValue(t));
                }
                return null;
            default:
                return term.key || term.name || JSON.stringify(term);
        }
    }

    /**
     * Convert a term object to JavaScript object
     * @private
     */
    _termToObject(term) {
        if (!term) return null;

        switch (term.type) {
            case OP.ATOMIC:
                return {type: 'atomic', value: term.key};
            case OP.PRODUCT:
                if (Array.isArray(term.terms)) {
                    return {type: 'product', values: term.terms.map(t => this._termToObject(t))};
                }
                return {type: 'product', values: []};
            case OP.IMPLICATION:
                return {
                    type: 'implication',
                    subject: this._termToObject(term.subject),
                    predicate: this._termToObject(term.predicate)
                };
            case OP.EQUIVALENCE:
                return {
                    type: 'equivalence',
                    left: this._termToObject(term.subject),
                    right: this._termToObject(term.predicate)
                };
            default:
                return {type: term.type, raw: term};
        }
    }
}

export default NarseseTranslator;