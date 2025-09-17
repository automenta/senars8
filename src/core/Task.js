import {
    generateOptimizedId
} from '../utils/IdGenerator.js';
import {
    parseTerm
} from '../parser/parse-utils.js';
import config from '../config/index.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import {
    isTask
} from '../utils/task-utils.js';
import {
    PUNCTUATION
} from '../config/constants.js';


const {
    DEFAULT_TRUTH_VALUE
} = config;

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
        const {
            processedTerm,
            termKey
        } = this.#processTerm(term);

        // Initialize core properties
        this.#id = generateOptimizedId(`${termKey}${punctuation}`);
        this.#term = processedTerm;
        this.#termKey = termKey;
        this.#punctuation = punctuation;

        // Initialize state with default values
        this.#state = {
            priority: 0,
            truthValue: this.#normalizeTruthValue(truthValue),
            stamp: this.#createStamp(stamp)
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
        if (!term) {
            return false;
        }
        if (typeof term === 'string') {
            return term.length > 0;
        }
        if (typeof term === 'object') {
            return term.key && typeof term.key === 'string' && term.key.length > 0;
        }
        return false;
    }

    /**
     * Checks if punctuation is valid
     * @param {string} punctuation - The punctuation to validate
     * @returns {boolean} True if the punctuation is valid
     * @private
     */
    #isValidPunctuation(punctuation) {
        if (typeof punctuation !== 'string') {
            return false;
        }
        return punctuation === PUNCTUATION.BELIEF || punctuation === PUNCTUATION.GOAL || punctuation === PUNCTUATION.QUESTION;
    }

    /**
     * Processes a term to extract the key and parsed structure
     * @param {string|object} term - The term to process
     * @returns {object} Object containing processedTerm and termKey
     * @private
     */
    #processTerm(term) {
        if (typeof term === 'string') {
            return this.#processStringTerm(term);
        } else {
            return this.#processObjectTerm(term);
        }
    }

    /**
     * Processes a string term to extract the key and parsed structure
     * @param {string} term - The term string to process
     * @returns {object} Object containing processedTerm and termKey
     * @private
     */
    #processStringTerm(term) {
        const termKey = term;
        const processedTerm = parseTerm(term);

        if (!processedTerm) {
            throw new Error(`Failed to parse term: '${term}'. Please check the term syntax.`);
        }

        return {
            processedTerm,
            termKey
        };
    }

    /**
     * Processes an object term to extract the key and parsed structure
     * @param {object} term - The term object to process
     * @returns {object} Object containing processedTerm and termKey
     * @private
     */
    #processObjectTerm(term) {
        const termKey = term.key;
        const processedTerm = term.type ? term : parseTerm(term.key);

        if (!processedTerm) {
            throw new Error(`Failed to parse term: '${term.key}'. Please check the term syntax.`);
        }

        return {
            processedTerm,
            termKey
        };
    }

    /**
     * Normalizes a truth value object to ensure it has valid frequency and confidence values
     * @param {object} truthValue - The truth value to normalize
     * @returns {object} Normalized truth value
     * @private
     */
    #normalizeTruthValue(truthValue) {
        // Fast path for valid truth values
        if (this.#isValidTruthValue(truthValue)) {
            // Clamp values to valid range with descriptive messages
            let frequency = truthValue.frequency;
            let confidence = truthValue.confidence;

            // Handle NaN values
            if (isNaN(frequency) || isNaN(confidence)) {
                console.warn(`[Task] Invalid truth value with NaN values detected, falling back to defaults`);
                return { ...DEFAULT_TRUTH_VALUE
                };
            }

            if (frequency < 0 || frequency > 1 || !isFinite(frequency)) {
                frequency = Math.max(0, Math.min(1, frequency));
                console.warn(`[Task] Frequency value clamped to valid range [0,1]: ${truthValue.frequency}`);
            }

            if (confidence < 0 || confidence > 1 || !isFinite(confidence)) {
                confidence = Math.max(0, Math.min(1, confidence));
                console.warn(`[Task] Confidence value clamped to valid range [0,1]: ${truthValue.confidence}`);
            }

            return {
                frequency,
                confidence
            };
        }

        // Return default if invalid
        return { ...DEFAULT_TRUTH_VALUE
        };
    }

    /**
     * Checks if a truth value object is valid
     * @param {object} truthValue - The truth value to validate
     * @returns {boolean} True if the truth value is valid
     * @private
     */
    #isValidTruthValue(truthValue) {
        return truthValue &&
            typeof truthValue === 'object' &&
            typeof truthValue.frequency === 'number' &&
            typeof truthValue.confidence === 'number';
    }

    /**
     * Creates a stamp object with creation time and last accessed time
     * @param {object} stamp - The stamp data to merge with defaults
     * @returns {object} The created stamp object
     * @private
     */
    #createStamp(stamp) {
        const now = this.#getCurrentTimestamp();
        return {
            creationTime: now,
            lastAccessed: now,
            ...stamp
        };
    }

    /**
     * Gets the current timestamp
     * @returns {number} Current timestamp in milliseconds
     * @private
     */
    #getCurrentTimestamp() {
        return Date.now();
    }

    /**
     * Updates the last accessed timestamp to the current time
     */
    touch() {
        this.#state.stamp.lastAccessed = this.#getCurrentTimestamp();
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
            this._toStringCache = this.#formatTaskString();
        }
        return this._toStringCache;
    }

    /**
     * Formats the task as a string
     * @returns {string} Formatted task string
     * @private
     */
    #formatTaskString() {
        const frequency = this.#state.truthValue.frequency.toFixed(3);
        const confidence = this.#state.truthValue.confidence.toFixed(3);
        return `${this.#termKey}${this.#punctuation} (f: ${frequency}, c: ${confidence})`;
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
        const clonedTask = new Task(
            this.#term,
            this.#punctuation, { ...this.#state.truthValue
            }, { ...this.#state.stamp
            }
        );
        // Preserve the same ID for cloned tasks
        clonedTask.#id = this.#id;
        return clonedTask;
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
