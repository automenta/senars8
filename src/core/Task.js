import {v4 as uuidv4} from 'uuid';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import {isTask} from '../utils/task-utils.js';

const {DEFAULT_TRUTH_VALUE} = config;

/**
 * Task represents a specific cognitive act concerning a Term.
 * It is a stateful entity with truth values, priority, and temporal information.
 */
class Task {
    #id;
    #term;
    #termKey;
    #punctuation;
    #state;

    /**
     * Creates a new Task instance.
     * @param {string|object} term - The term associated with this task (either as a string or parsed object)
     * @param {string} punctuation - The punctuation mark indicating task type ('.' for belief, '!' for goal, '?' for question)
     * @param {object} [truthValue={}] - The truth value with frequency and confidence
     * @param {object} [stamp={}] - The temporal stamp information
     */
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        // Validate inputs
        if (!this.#isValidTerm(term) || !this.#isValidPunctuation(punctuation)) {
            throw new Error('Invalid Task arguments: term and punctuation are required');
        }

        // Process term
        const {processedTerm, termKey} = this.#processTerm(term);

        // Validate truth value
        const validatedTruthValue = this.#validateTruthValue(truthValue);

        // Initialize core properties
        this.#id = uuidv4();
        this.#term = processedTerm;
        this.#termKey = termKey;
        this.#punctuation = punctuation;

        // Initialize state with default values
        this.#state = {
            priority: 0,
            truthValue: validatedTruthValue,
            stamp: {
                creationTime: Date.now(), // Using number instead of BigInt for better performance
                lastAccessed: Date.now(), // Using number instead of BigInt for better performance
                ...stamp
            }
        };
    }

    // Getters for private properties
    get id() {
        return this.#id;
    }

    get term() {
        return this.#term;
    }

    get termKey() {
        return this.#termKey;
    }

    get punctuation() {
        return this.#punctuation;
    }

    get state() {
        return this.#state;
    }

    /**
     * Checks if a term is valid
     * @param {any} term - The term to validate
     * @returns {boolean} True if the term is valid
     * @private
     */
    #isValidTerm(term) {
        return term && (typeof term === 'string' || (typeof term === 'object' && term.key));
    }

    /**
     * Checks if punctuation is valid
     * @param {string} punctuation - The punctuation to validate
     * @returns {boolean} True if the punctuation is valid
     * @private
     */
    #isValidPunctuation(punctuation) {
        return typeof punctuation === 'string' &&
            (punctuation === '.' || punctuation === '!' || punctuation === '?');
    }

    /**
     * Processes a term to extract the key and parsed structure
     * @param {string|object} term - The term to process
     * @returns {object} Object containing processedTerm and termKey
     * @private
     */
    #processTerm(term) {
        let processedTerm;
        let termKey;

        if (typeof term === 'string') {
            termKey = term;
            processedTerm = parseTerm(term);
            if (!processedTerm) {
                throw new Error(`Failed to parse term: ${term}`);
            }
        } else {
            // term is an object
            termKey = term.key;
            processedTerm = term.type ? term : parseTerm(term.key);
            if (!processedTerm) {
                throw new Error(`Failed to parse term: ${term.key}`);
            }
        }

        return {processedTerm, termKey};
    }

    /**
     * Validates a truth value object
     * @param {object} truthValue - The truth value to validate
     * @returns {object} Validated truth value
     * @private
     */
    #validateTruthValue(truthValue) {
        // Fast path for valid truth values
        if (truthValue &&
            typeof truthValue === 'object' &&
            typeof truthValue.frequency === 'number' &&
            typeof truthValue.confidence === 'number') {
            // Clamp values to valid range
            const frequency = Math.max(0, Math.min(1, truthValue.frequency));
            const confidence = Math.max(0, Math.min(1, truthValue.confidence));
            return {frequency, confidence};
        }

        // Return default if invalid
        return {...DEFAULT_TRUTH_VALUE};
    }

    /**
     * Updates the last accessed timestamp to the current time
     */
    touch() {
        this.#state.stamp.lastAccessed = Date.now();
    }

    /**
     * Revises the truth value of the task using Bayesian revision
     * @param {object} newEvidence - The new evidence with frequency and confidence
     * @param {number} [weight=0.5] - The weight to give to the new evidence
     * @returns {object} The revised truth value
     */
    reviseTruthValue(newEvidence, weight = 0.5) {
        const revisedTruthValue = TruthValueManager.bayesianRevision(this.#state.truthValue, newEvidence, weight);
        this.#state.truthValue = revisedTruthValue;
        return revisedTruthValue;
    }

    /**
     * Returns a string representation of the task
     * @returns {string} String representation of the task
     */
    toString() {
        // Cache the formatted string for better performance if called multiple times
        if (!this._toStringCache) {
            this._toStringCache = `${this.#termKey}${this.#punctuation} (f: ${this.#state.truthValue.frequency.toFixed(3)}, c: ${this.#state.truthValue.confidence.toFixed(3)})`;
        }
        return this._toStringCache;
    }

    /**
     * Checks if this task is equal to another task
     * @param {Task} other - The other task to compare with
     * @returns {boolean} True if the tasks are equal
     */
    equals(other) {
        return isTask(other) && this.#id === other.#id;
    }

    /**
     * Creates a clone of this task
     * @returns {Task} A new task instance with the same properties
     */
    clone() {
        return new Task(
            this.#term,
            this.#punctuation,
            {...this.#state.truthValue},
            {...this.#state.stamp}
        );
    }

    /**
     * Converts the task to a JSON-serializable object
     * @returns {object} JSON representation of the task
     */
    toJSON() {
        return {
            id: this.#id,
            termKey: this.#termKey,
            punctuation: this.#punctuation,
            state: {
                ...this.#state
            }
        };
    }
}

export default Task;
