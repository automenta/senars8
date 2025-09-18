import {generateOptimizedId} from '../utils/IdGenerator.js';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import {validatePunctuation, validateTerm} from '../utils/validation.js';
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
        validateTerm(term, 'Task term');
        validatePunctuation(punctuation, 'Task punctuation');

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

    #processTerm(term) {
        const isString = typeof term === 'string';
        const termKey = isString ? term : term.key;
        const processedTerm = isString || !term.type ? parseTerm(termKey) : term;
        if (!processedTerm) {
            throw new Error(`Failed to parse term: '${termKey}'.`);
        }
        return {
            processedTerm,
            termKey
        };
    }

    #normalizeTruthValue(truthValue) {
        if (truthValue && typeof truthValue.frequency === 'number' && typeof truthValue.confidence === 'number') {
            const frequency = Math.max(0, Math.min(1, truthValue.frequency));
            const confidence = Math.max(0, Math.min(1, truthValue.confidence));
            if (!isNaN(frequency) && !isNaN(confidence)) {
                return {
                    frequency,
                    confidence
                };
            }
        }
        return { ...DEFAULT_TRUTH_VALUE
        };
    }

    #createStamp(stamp) {
        const now = this.#getCurrentTimestamp();
        return {
            creationTime: now,
            lastAccessed: now,
            ...stamp
        };
    }

    #getCurrentTimestamp() {
        return BigInt(Date.now());
    }

    touch() {
        this.#state.stamp.lastAccessed = this.#getCurrentTimestamp();
    }

    reviseTruthValue(newEvidence, weight = 0.5) {
        this.#state.truthValue = TruthValueManager.bayesianRevision(this.#state.truthValue, newEvidence, weight);
        return this.#state.truthValue;
    }

    formatString() {
        const {
            frequency,
            confidence
        } = this.#state.truthValue;
        return `${this.#termKey}${this.#punctuation} (f: ${frequency.toFixed(3)}, c: ${confidence.toFixed(3)})`;
    }

    getId() {
        return this.#id;
    }

    clone() {
        const clonedTask = new Task(
            this.#term,
            this.#punctuation, {
                ...this.#state.truthValue
            }, {
                ...this.#state.stamp
            }
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
}

export default Task;
