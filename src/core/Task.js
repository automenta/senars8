const {v4: uuidv4} = require('uuid');
const {parseTerm} = require('../parser/narseseParser');
const config = require('../config');

const DEFAULT_TRUTH_VALUE = config.DEFAULT_TRUTH_VALUE;

class Task {
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

    static fromJSON(json, memory) {
        if (!json || !json.termKey || !memory) return null;

        const term = memory.getTerm(json.termKey);
        if (!term) return null;

        // Convert stamp strings back to BigInts
        const deserializedStamp = {...json.state.stamp};
        for (const key in deserializedStamp) {
            // A simple check if the string represents a number
            if (typeof deserializedStamp[key] === 'string' && /^\d+$/.test(deserializedStamp[key])) {
                deserializedStamp[key] = BigInt(deserializedStamp[key]);
            }
        }

        const task = new Task(term, json.punctuation, json.state.truthValue, deserializedStamp);
        task.id = json.id; // Preserve original ID
        task.state.priority = json.state.priority;

        return task;
    }

    static isBelief(task) {
        return task?.punctuation === '.';
    }

    static isGoal(task) {
        return task?.punctuation === '!';
    }

    static isQuestion(task) {
        return task?.punctuation === '?';
    }

    static getTasksByType(tasks, type) {
        return tasks.filter(task => task?.punctuation === type);
    }

    static getBeliefTasks(tasks) {
        return Task.getTasksByType(tasks, '.');
    }

    static getGoalTasks(tasks) {
        return Task.getTasksByType(tasks, '!');
    }

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

    touch() {
        this.state.stamp.lastAccessed = BigInt(Date.now());
    }

    toString() {
        return `${this.termKey}${this.punctuation} (f: ${this.state.truthValue.frequency.toFixed(3)}, c: ${this.state.truthValue.confidence.toFixed(3)})`;
    }

    equals(other) {
        return other instanceof Task && this.id === other.id;
    }

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

module.exports = Task;
