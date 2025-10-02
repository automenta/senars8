import {parseTerm} from '../parser/parse-utils.js';
import {embeddingsEqual} from '../utils/math.js';
import EmbeddingStore from '../utils/embeddingStore.js';
import {OP} from '../config/constants.js';
import * as validation from '../utils/validation.js';
import BaseEntity from './BaseEntity.js';
import {isNonEmptyArray} from '../utils/collections/index.js';
import createKeyBuilder from '../parser/key-builders/index.js';
import {warn} from '../utils/logger.js';
import {createSharedInstance} from '../utils/instance-sharing.js';

class Term extends BaseEntity {
    static #keyBuilder = null;
    #key;
    #embeddingRef;
    #complexity;
    #structure;
    #componentCache;

    constructor(key, embedding = [], complexity = 1) {
        super();
        validation.string(key, 'Term key');

        this.#key = key;
        this.#embeddingRef = isNonEmptyArray(embedding)
            ? EmbeddingStore.store(key, embedding)
            : null;
        this.#complexity = complexity;
        this.#structure = undefined; // Use undefined to indicate not yet parsed
        this.#componentCache = {};

        Object.defineProperties(this, {
            subject: {
                get: () => this.#getComponent('subject'),
                enumerable: true,
            },
            predicate: {
                get: () => this.#getComponent('predicate'),
                enumerable: true,
            },
        });
    }

    // Getters
    get key() {
        return this.#key;
    }

    get embedding() {
        return this.#embeddingRef ? EmbeddingStore.get(this.#embeddingRef) || [] : [];
    }

    get complexity() {
        return this.#complexity;
    }

    get type() {
        const structure = this.#getStructure();
        return structure ? structure.type : OP.ATOMIC;
    }

    get terms() {
        if (this.#componentCache.terms) return this.#componentCache.terms;

        const structure = this.#getStructure();
        if (!structure?.terms) {
            return (this.#componentCache.terms = null);
        }

        try {
            return (this.#componentCache.terms = structure.terms.map((term, i) => this.#getComponent(`term_${i}`, term)));
        } catch (error) {
            warn(`Error getting terms for ${this.#key}: ${error.message}`);
            return (this.#componentCache.terms = null);
        }
    }

    static #getKeyBuilder() {
        if (!Term.#keyBuilder) {
            Term.#keyBuilder = createKeyBuilder((pTerm, silent) => Term.termKey(pTerm, silent));
        }
        return Term.#keyBuilder;
    }

    // Static methods
    static termsEqual(term1, term2) {
        if (term1 === term2) return true;
        if (!term1 || !term2 || term1.key !== term2.key || term1.complexity !== term2.complexity) return false;
        return embeddingsEqual(term1.embedding, term2.embedding);
    }

    static fromJSON(json) {
        if (!json?.key) return null;

        return createSharedInstance(json.key, Term, json.key, json.embedding, json.complexity);
    }

    static termKey(pTerm, silent = false) {
        if (!pTerm?.type) {
            if (!silent) warn('termKey called with invalid pTerm');
            return '';
        }

        const builder = Term.#getKeyBuilder()[pTerm.type];
        if (!builder) {
            if (!silent) throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
            return '';
        }

        try {
            return builder(pTerm, silent);
        } catch (error) {
            if (!silent) warn(`Error building term key for type ${pTerm.type}: ${error.message}`);
            return '';
        }
    }

    static createInner(key, embedding = [], complexity = 1) {
        if (typeof key !== 'string' || key.length === 0) return null;

        return createSharedInstance(key, Term, key, embedding, complexity);
    }

    // Public methods
    setEmbedding(embedding) {
        if (this.#embeddingRef) {
            EmbeddingStore.release(this.#embeddingRef);
        }
        this.#embeddingRef = isNonEmptyArray(embedding) ? EmbeddingStore.store(this.#key, embedding) : null;
    }

    formatString() {
        return this.#key;
    }

    getId() {
        return this.#key;
    }

    clone() {
        // When cloning, we don't create a new instance from scratch, but rather a shallow copy.
        const cloned = new Term(this.#key, this.embedding, this.#complexity);
        cloned.#componentCache = {}; // Reset cache for the clone
        return cloned;
    }


    toJSON() {
        return {
            key: this.#key,
            embedding: this.embedding,
            complexity: this.#complexity,
        };
    }

    toString() {
        return this.#key;
    }

    hashCode() {
        if (this._hashCode !== undefined) return this._hashCode;
        let hash = 0;
        for (let i = 0; i < this.#key.length; i++) {
            hash = ((hash << 5) - hash) + this.#key.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return (this._hashCode = hash);
    }

    destroy() {
        if (this.#embeddingRef) {
            EmbeddingStore.release(this.#embeddingRef);
            this.#embeddingRef = null;
        }
        this.#componentCache = {};
        this.#structure = null;
    }

    // Private methods
    #getStructure() {
        if (this.#structure === undefined) {
            try {
                this.#structure = parseTerm(this.#key) || null;
            } catch {
                this.#structure = null;
            }
        }
        return this.#structure;
    }

    #getComponent(componentName, structure) {
        if (Object.hasOwn(this.#componentCache, componentName)) {
            return this.#componentCache[componentName];
        }

        const termStructure = structure || this.#getStructure()?.[componentName];
        if (!termStructure) {
            return (this.#componentCache[componentName] = null);
        }

        try {
            const componentKey = Term.termKey(termStructure, true);
            return (this.#componentCache[componentName] = componentKey ? Term.createInner(componentKey) : null);
        } catch {
            return (this.#componentCache[componentName] = null);
        }
    }
}

export default Term;