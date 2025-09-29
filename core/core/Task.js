import {generateOptimizedId} from '../utils/idGenerator.js';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import TruthValueManager from '../reasoner/TruthValueManager.js';
import * as validation from '../utils/validation.js';
import {warn} from '../../common/services/Logger.js';
import BaseEntity from './BaseEntity.js';
import InstanceManager from '../utils/InstanceManager.js';

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

    // Getters
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

    static createInner(term, punctuation, truthValue = {}, stamp = {}) {
        const termKey = typeof term === 'string' ? term : term.key;
        const taskId = generateOptimizedId(`${termKey}${punctuation}`);

        if (config.performance.ENABLE_INSTANCE_SHARING && InstanceManager.has(taskId)) {
            return InstanceManager.get(taskId);
        }

        try {
            const newTask = new Task(term, punctuation, truthValue, stamp);
            if (config.performance.ENABLE_INSTANCE_SHARING) {
                InstanceManager.add(taskId, newTask);
            }
            return newTask;
        } catch {
            return null;
        }
    }

    static fromMacro(macro) {
        let termKey;
        let punctuation;
        let truthValue;
        let stamp;

        if (macro.term && macro.punctuation) {
            termKey = macro.term.key;
            punctuation = macro.punctuation;
            truthValue = macro.truth;
            stamp = macro.stamp;
        } else if (macro.sentence) {
            const {sentence, truth, stamp: macroStamp} = macro;
            punctuation = sentence.slice(-1);
            termKey = sentence.slice(0, -1);
            truthValue = (truth && truth.length === 2) ?
                {frequency: truth[0], confidence: truth[1]} :
                undefined;
            stamp = macroStamp;
        } else {
            warn(`Invalid macro definition: ${JSON.stringify(macro)}`);
            return null;
        }

        if (!['.', '?', '!'].includes(punctuation)) {
            warn(`Invalid or missing punctuation in macro sentence: "${termKey}${punctuation}"`);
            return null;
        }

        const taskId = generateOptimizedId(`${termKey}${punctuation}`);
        if (config.performance.ENABLE_INSTANCE_SHARING && InstanceManager.has(taskId)) {
            return InstanceManager.get(taskId);
        }

        const parsedTerm = parseTerm(termKey);
        if (!parsedTerm) {
            warn(`Failed to parse term from macro: "${termKey}"`);
            return null;
        }

        const newTask = new Task(parsedTerm, punctuation, truthValue, stamp);
        if (config.performance.ENABLE_INSTANCE_SHARING) {
            InstanceManager.add(taskId, newTask);
        }
        return newTask;
    }


    #processTerm(term) {
        const termKey = typeof term === 'string' ? term : term.key;
        const processedTerm = typeof term === 'string' ? parseTerm(term) : (term.type ? term : parseTerm(term.key));

        if (!processedTerm) {
            throw new Error(`Failed to parse term: '${termKey}'.`);
        }

        return {
            processedTerm,
            termKey
        };
    }

    #normalizeTruthValue(truthValue) {
        const {
            frequency,
            confidence
        } = truthValue || {};
        if (typeof frequency === 'number' && typeof confidence === 'number') {
            const freq = Math.max(0, Math.min(1, frequency));
            const conf = Math.max(0, Math.min(1, confidence));
            if (!isNaN(freq) && !isNaN(conf)) {
                return {
                    frequency: freq,
                    confidence: conf
                };
            }
        }
        return {
            ...DEFAULT_TRUTH_VALUE
        };
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
        const {
            frequency,
            confidence
        } = this.#state.truthValue;
        return `${this.#termKey}${this.#punctuation} (f: ${frequency.toFixed(3)}, c: ${confidence.toFixed(3)})`;
    }

    toString() {
        return this.formatString();
    }

    toDisplayString() {
        const truthValue = this.#state.truthValue;
        const priorityPercent = Math.round(this.#state.priority * 100);
        return `${this.#termKey}${this.#punctuation} [priority: ${priorityPercent}%, confidence: ${(truthValue.confidence * 100).toFixed(1)}%]`;
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