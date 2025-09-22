import {generateOptimizedId} from '../utils/idGenerator.js';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import * as validation from '../utils/validation.js';
import BaseEntity from './BaseEntity.js';


const {
    DEFAULT_TRUTH_VALUE
} = config;

class Task extends BaseEntity {
    #id;
    #term;
    #termKey;
    #punctuation;
    #state;

    constructor(term, punctuation, truthValue = {}, stamp = {}) {
        super();
        if (term && typeof term === 'object' && term.punctuation && !punctuation) {
            punctuation = term.punctuation;
        }

        validation.validateTerm(term, 'Task term');
        validation.validatePunctuation(punctuation, 'Task punctuation');

        const {
            processedTerm,
            termKey
        } = this.#processTerm(term);

        this.#id = generateOptimizedId(`${termKey}${punctuation}`);
        this.#term = processedTerm;
        this.#termKey = termKey;
        this.#punctuation = punctuation;

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

    static #getCurrentTimestamp() {
        return BigInt(Date.now());
    }

    #processTerm(term) {
        const termKey = typeof term === 'string' ? term : term.key;
        const processedTerm = typeof term === 'string' ? parseTerm(term) : (term.type ? term : parseTerm(term.key));

        if (!processedTerm) {
            throw new Error(`Failed to parse term: '${termKey}'.`);
        }

        return {processedTerm, termKey};
    }

    #normalizeTruthValue(truthValue) {
        const {frequency, confidence} = truthValue || {};
        if (typeof frequency === 'number' && typeof confidence === 'number') {
            const freq = Math.max(0, Math.min(1, frequency));
            const conf = Math.max(0, Math.min(1, confidence));
            if (!isNaN(freq) && !isNaN(conf)) {
                return {frequency: freq, confidence: conf};
            }
        }
        return {...DEFAULT_TRUTH_VALUE};
    }

    #createStamp(stamp) {
        const now = Task.#getCurrentTimestamp();
        return {
            creationTime: now,
            lastAccessed: now,
            ...stamp
        };
    }

    touch() {
        this.#state.stamp.lastAccessed = Task.#getCurrentTimestamp();
    }

    reviseTruthValue(newEvidence, weight = 0.5) {
        const revisedTruthValue = TruthValueManager.bayesianRevision(
            this.#state.truthValue,
            newEvidence,
            weight
        );
        this.#state.truthValue = revisedTruthValue;
        return revisedTruthValue;
    }

    formatString() {
        const {frequency, confidence} = this.#state.truthValue;
        return `${this.#termKey}${this.#punctuation} (f: ${frequency.toFixed(3)}, c: ${confidence.toFixed(3)})`;
    }

    getId() {
        return this.#id;
    }

    clone() {
        const clonedTask = new Task(
            this.#term,
            this.#punctuation,
            {...this.#state.truthValue},
            {...this.#state.stamp}
        );
        // Preserve the same ID for cloned tasks
        clonedTask.#id = this.#id;
        return clonedTask;
    }

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

    static createInner(term, punctuation, truthValue = {}, stamp = {}) {
        try {
            // For inner operations, we just return null instead of throwing for invalid inputs
            validation.validateTerm(term, 'Task term');
            validation.validatePunctuation(punctuation, 'Task punctuation');

            const processedTerm = typeof term === 'string' ? parseTerm(term) : (term.type ? term : parseTerm(term.key));

            // If we couldn't process the term, return null for inner operations
            if (!processedTerm) {
                return null;
            }

            return new Task(term, punctuation, truthValue, stamp);
        } catch {
            return null;
        }
    }
}

export default Task;
