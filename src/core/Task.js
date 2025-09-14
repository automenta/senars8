import {v4 as uuidv4} from 'uuid';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';

const DEFAULT_TRUTH_VALUE = config.DEFAULT_TRUTH_VALUE;

/**
 * Task represents a specific cognitive act concerning a Term.
 * It is a stateful entity with truth values, priority, and temporal information.
 */
class Task {
    /**
     * Creates a new Task instance.
     * @param {string|object} term - The term associated with this task (either as a string or parsed object)
     * @param {string} punctuation - The punctuation mark indicating task type ('.' for belief, '!' for goal, '?' for question)
     * @param {object} [truthValue={}] - The truth value with frequency and confidence
     * @param {object} [stamp={}] - The temporal stamp information
     */
    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        const isValidTerm = term && (typeof term === 'string' || (typeof term === 'object' && term.key));
        const isValidPunctuation = typeof punctuation === 'string' && ['.', '!', '?'].includes(punctuation);

        if (!isValidTerm || !isValidPunctuation) {
            throw new Error('Invalid Task arguments: term and punctuation are required');
        }

        // Process term
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

        // Validate truth value
        const validatedTruthValue = this._validateTruthValue(truthValue);

        // Initialize core properties
        this.id = uuidv4();
        this.term = processedTerm;
        this.termKey = termKey;
        this.punctuation = punctuation;

        // Initialize state with default values
        this.state = {
            priority: 0,
            truthValue: validatedTruthValue,
            stamp: {
                creationTime: BigInt(Date.now()),
                lastAccessed: BigInt(Date.now()),
                ...stamp
            },
        };
    }

    /**
     * Checks if a task is a belief (punctuation '.')
     * @param {Task} task - The task to check
     * @returns {boolean} True if the task is a belief
     */
    static isBelief(task) {
        return task?.punctuation === '.';
    }

    /**
     * Checks if a task is a goal (punctuation '!')
     * @param {Task} task - The task to check
     * @returns {boolean} True if the task is a goal
     */
    static isGoal(task) {
        return task?.punctuation === '!';
    }

    /**
     * Checks if a task is a question (punctuation '?')
     * @param {Task} task - The task to check
     * @returns {boolean} True if the task is a question
     */
    static isQuestion(task) {
        return task?.punctuation === '?';
    }

    /**
     * Filters tasks by punctuation type
     * @param {Task[]} tasks - Array of tasks to filter
     * @param {string} type - The punctuation type to filter by
     * @returns {Task[]} Array of filtered tasks
     */
    static getTasksByType(tasks, type) {
        return tasks.filter(task => task?.punctuation === type);
    }

    /**
     * Gets all belief tasks from an array of tasks
     * @param {Task[]} tasks - Array of tasks
     * @returns {Task[]} Array of belief tasks
     */
    static getBeliefTasks(tasks) {
        return Task.getTasksByType(tasks, '.');
    }

    /**
     * Gets all goal tasks from an array of tasks
     * @param {Task[]} tasks - Array of tasks
     * @returns {Task[]} Array of goal tasks
     */
    static getGoalTasks(tasks) {
        return Task.getTasksByType(tasks, '!');
    }

    /**
     * Gets all question tasks from an array of tasks
     * @param {Task[]} tasks - Array of tasks
     * @returns {Task[]} Array of question tasks
     */
    static getQuestionTasks(tasks) {
        return Task.getTasksByType(tasks, '?');
    }

    _validateTruthValue(truthValue) {
        if (!truthValue || typeof truthValue !== 'object') {
            return {...DEFAULT_TRUTH_VALUE};
        }

        const frequency = typeof truthValue.frequency === 'number'
            ? Math.max(0, Math.min(1, truthValue.frequency))
            : DEFAULT_TRUTH_VALUE.frequency;

        const confidence = typeof truthValue.confidence === 'number'
            ? Math.max(0, Math.min(1, truthValue.confidence))
            : DEFAULT_TRUTH_VALUE.confidence;

        return {frequency, confidence};
    }

    /**
     * Updates the last accessed timestamp to the current time
     */
    touch() {
        this.state.stamp.lastAccessed = BigInt(Date.now());
    }

    /**
     * Revises the truth value of the task using Bayesian revision
     * @param {object} newEvidence - The new evidence with frequency and confidence
     * @param {number} [weight=0.5] - The weight to give to the new evidence
     * @returns {object} The revised truth value
     */
    reviseTruthValue(newEvidence, weight = 0.5) {
        const revisedTruthValue = TruthValueManager.bayesianRevision(this.state.truthValue, newEvidence, weight);
        this.state.truthValue = revisedTruthValue;
        return revisedTruthValue;
    }

    /**
     * Returns a string representation of the task
     * @returns {string} String representation of the task
     */
    toString() {
        return `${this.termKey}${this.punctuation} (f: ${this.state.truthValue.frequency.toFixed(3)}, c: ${this.state.truthValue.confidence.toFixed(3)})`;
    }

    /**
     * Checks if this task is equal to another task
     * @param {Task} other - The other task to compare with
     * @returns {boolean} True if the tasks are equal
     */
    equals(other) {
        return other instanceof Task && this.id === other.id;
    }

    /**
     * Creates a clone of this task
     * @returns {Task} A new task instance with the same properties
     */
    clone() {
        return new Task(this.term, this.punctuation, {...this.state.truthValue}, {...this.state.stamp});
    }

    toJSON() {
        // Convert BigInts to strings for serialization
        const serializableStamp = {...this.state.stamp};
        for (const key in serializableStamp) {
            if (typeof serializableStamp[key] === 'bigint') {
                serializableStamp[key] = serializableStamp[key].toString();
            }
        }

        return {
            id: this.id,
            termKey: this.termKey,
            punctuation: this.punctuation,
            state: {
                ...this.state,
                stamp: serializableStamp
            }
        };
    }
}

export default Task;
