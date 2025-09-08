const {v4: uuidv4} = require('uuid');
const {parseTerm} = require('../parser/narseseParser');
const config = require('../config');

const DEFAULT_TRUTH_VALUE = config.DEFAULT_TRUTH_VALUE;

/**
 * Represents a task in the cognitive architecture
 * 
 * A task consists of a term, punctuation (belief, goal, or question), 
 * truth value, and metadata (priority, timestamps).
 * 
 * Tasks are the fundamental units of cognition in the system, representing
 * beliefs, goals, and questions about terms in the knowledge hypergraph.
 * 
 * @class Task
 */
class Task {
    /**
     * Create a new Task
     * 
     * @param {object} term - The term associated with this task
     * @param {string} term.key - The term key
     * @param {string} punctuation - The punctuation mark ('.', '!', or '?')
     *   - '.' represents a belief/judgment
     *   - '!' represents a goal
     *   - '?' represents a question
     * @param {object} [truthValue={}] - The truth value (frequency and confidence)
     * @param {number} [truthValue.frequency=1.0] - The frequency value (0.0 to 1.0)
     *   Represents how often the statement is true
     * @param {number} [truthValue.confidence=0.9] - The confidence value (0.0 to 1.0)
     *   Represents the system's confidence in the frequency estimate
     * @param {object} [stamp={}] - Metadata about the task
     * @param {bigint} [stamp.creationTime] - When the task was created
     * @param {bigint} [stamp.lastAccessed] - When the task was last accessed
     * @param {bigint} [stamp.occurrenceTime] - When the event occurred (for temporal tasks)
     * @param {bigint} [stamp.endTime] - When the event ended (for temporal tasks)
     * 
     * @throws {Error} If term or punctuation is invalid
     * 
     * @example
     * // Create a belief task
     * const term = { key: 'cat' };
     * const beliefTask = new Task(term, '.', { frequency: 0.8, confidence: 0.9 });
     * 
     * @example
     * // Create a goal task
     * const goalTask = new Task(parseTerm('find_food'), '!', { frequency: 1.0, confidence: 0.95 });
     * 
     * @example
     * // Create a question task
     * const questionTask = new Task(parseTerm('what_time_is_it'), '?', { frequency: 1.0, confidence: 0.8 });
     */
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        // Validate required parameters
        const isValidTerm = term?.key;
        const isValidPunctuation = ['.', '!', '?'].includes(punctuation);
        
        if (!isValidTerm || !isValidPunctuation) {
            throw new Error('Invalid Task arguments: term and punctuation are required');
        }

        // Initialize core properties
        this.id = uuidv4();
        // Only parse the term if it doesn't already have a type
        this.term = term.type ? term : parseTerm(term.key);
        this.termKey = term.key;
        this.punctuation = punctuation;

        // Initialize state with default values
        this.state = {
            priority: 0,
            truthValue: {...DEFAULT_TRUTH_VALUE, ...truthValue},
            stamp: {
                creationTime: BigInt(Date.now()),
                lastAccessed: BigInt(Date.now()),
                ...stamp
            },
        };
    }

    /**
     * Update the last accessed timestamp to current time
     * 
     * This method is called when the task is accessed to update its recency.
     * Recency is one factor in the economic attention model that determines
     * which tasks are selected for reasoning.
     */
    touch() {
        this.state.stamp.lastAccessed = BigInt(Date.now());
    }

    /**
     * Get a string representation of the task
     * 
     * @returns {string} String representation of the task
     */
    toString() {
        return `${this.termKey}${this.punctuation} (f: ${this.state.truthValue.frequency.toFixed(3)}, c: ${this.state.truthValue.confidence.toFixed(3)})`;
    }

    /**
     * Check if this task is equal to another task
     * 
     * Two tasks are equal if they have the same ID.
     * 
     * @param {Task} other - The task to compare with
     * @returns {boolean} True if the tasks are equal, false otherwise
     */
    equals(other) {
        return other instanceof Task && this.id === other.id;
    }

    /**
     * Clone this task with a new ID
     * 
     * @returns {Task} A clone of this task
     */
    clone() {
        return new Task(this.term, this.punctuation, {...this.state.truthValue}, {...this.state.stamp});
    }
}

module.exports = Task;
