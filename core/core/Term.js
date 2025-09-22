import {parseTerm} from '../parser/parse-utils.js';
import {embeddingsEqual} from '../utils/math.js';
import EmbeddingStore from '../utils/embeddingStore.js';
import {OP, REL} from '../config/constants.js';
import * as validation from '../utils/validation.js';
import BaseEntity from './BaseEntity.js';
import {isNonEmptyArray} from '../utils/collections/index.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('Term');

class Term extends BaseEntity {
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
        this.#structure = null;
        this.#componentCache = {};
    }

    // Getters for private properties
    get key() {
        return this.#key;
    }

    get embedding() {
        // Retrieve embedding from shared store
        return this.#embeddingRef ? EmbeddingStore.get(this.#embeddingRef) || [] : [];
    }

    get complexity() {
        return this.#complexity;
    }

    get type() {
        const structure = this.#getStructure();
        return structure ? structure.type : OP.ATOMIC;
    }

    get subject() {
        return this.#getComponent('subject');
    }

    get predicate() {
        return this.#getComponent('predicate');
    }

    get terms() {
        if (Object.hasOwn(this.#componentCache, 'terms')) {
            return this.#componentCache['terms'];
        }

        const structure = this.#getStructure();
        if (!structure?.terms) {
            return (this.#componentCache['terms'] = null);
        }

        return errorHandler.executeSync(() => {
            const termsArray = structure.terms.map((term, i) => this.#getComponent(`term_${i}`, term));
            return (this.#componentCache['terms'] = termsArray);
        }, 'get-terms', null);
    }

    static termsEqual(term1, term2) {
        return errorHandler.executeSync(() => {
            if (term1 === term2) return true;
            if (!term1 || !term2 || term1.key !== term2.key || term1.complexity !== term2.complexity) return false;

            return embeddingsEqual(term1.embedding, term2.embedding);
        }, 'termsEqual', false);
    }

    static fromJSON(json) {
        return errorHandler.executeSync(() => {
            return json?.key ? new Term(json.key, json.embedding, json.complexity) : null;
        }, 'fromJSON', null);
    }

    static termKey(pTerm) {
        if (!pTerm?.type) {
            return errorHandler.executeSync(() => '', 'termKey', '');
        }

        const keyBuilder = Term.keyBuilder[pTerm.type];
        if (keyBuilder) {
            return errorHandler.executeSync(() => keyBuilder(pTerm), 'termKey', '');
        }

        throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
    }

    static termKeyInner(pTerm) {
        if (!pTerm?.type) {
            return ''; // Return empty string instead of going through error handler for inner operations
        }

        const keyBuilder = Term.keyBuilder[pTerm.type];
        if (keyBuilder) {
            // For inner operations, return empty string on failure instead of throwing
            try {
                return keyBuilder(pTerm);
            } catch {
                return '';
            }
        }

        // For unsupported types in inner operations, just return empty string
        return '';
    }

    static termKeyInfix = (pTerm, op) => `(${Term.termKey(pTerm.subject)} ${op} ${Term.termKey(pTerm.predicate)})`;

    static termList = terms => (terms?.length ? terms.map(Term.termKey).join(',') : '');

    static keyBuilder = {
        [OP.ATOMIC]: pTerm => pTerm.key,
        [OP.INDEPENDENT_VARIABLE]: pTerm => pTerm.name,
        [OP.DEPENDENT_VARIABLE]: pTerm => `#${pTerm.name}`,
        [OP.QUERY_VARIABLE]: pTerm => `?${pTerm.name}`,
        [OP.INHERITANCE]: pTerm => Term.termKeyInfix(pTerm, REL.INHERITANCE),
        [OP.IMPLICATION]: pTerm => Term.termKeyInfix(pTerm, REL.IMPLICATION),
        [OP.EQUIVALENCE]: pTerm => Term.termKeyInfix(pTerm, REL.EQUIVALENCE),
        [OP.SIMILARITY]: pTerm => Term.termKeyInfix(pTerm, REL.SIMILARITY),
        [OP.INSTANCE]: pTerm => `(${Term.termKey(pTerm.subject)} ${REL.INSTANCE} ${Term.termKey(pTerm.predicate)})`,
        [OP.PROPERTY]: pTerm => `(${Term.termKey(pTerm.subject)} ${REL.PROPERTY} ${Term.termKey(pTerm.predicate)})`,
        [OP.PREDICTIVE_IMPLICATION]: pTerm => `(${Term.termKey(pTerm.subject)} ${REL.PREDICTIVE_IMPLICATION} ${Term.termKey(pTerm.predicate)})`,
        [OP.RETROSPECTIVE_IMPLICATION]: pTerm => `(${Term.termKey(pTerm.subject)} ${REL.RETROSPECTIVE_IMPLICATION} ${Term.termKey(pTerm.predicate)})`,
        [OP.CONCURRENT_IMPLICATION]: pTerm => `(${Term.termKey(pTerm.subject)} ${REL.CONCURRENT_IMplication} ${Term.termKey(pTerm.predicate)})`,
        [OP.UNTIL]: pTerm => `(${Term.termKey(pTerm.subject)} until ${Term.termKey(pTerm.predicate)})`,
        [OP.SINCE]: pTerm => `(${Term.termKey(pTerm.subject)} since ${Term.termKey(pTerm.predicate)})`,
        [OP.NEGATION]: pTerm => `(${REL.NEGATION}${Term.termKey(pTerm.term)})`,
        [OP.ALWAYS]: pTerm => `(${REL.ALWAYS}${Term.termKey(pTerm.term)})`,
        [OP.EVENTUALLY]: pTerm => `(${REL.EVENTUALLY}${Term.termKey(pTerm.term)})`,
        [OP.NEXT]: pTerm => `(${REL.NEXT}${Term.termKey(pTerm.term)})`,
        [OP.PREVIOUS]: pTerm => `(${REL.PREVIOUS}${Term.termKey(pTerm.term)})`,
        [OP.CONJUNCTION]: pTerm => `(${REL.CONJUNCTION}${Term.termList(pTerm.terms || [])})`,
        [OP.DISJUNCTION]: pTerm => `(${REL.DISJUNCTION}${Term.termList(pTerm.terms || [])})`,
        [OP.SEQUENTIAL_CONJUNCTION]: pTerm => `(${REL.SEQUENTIAL_CONJUNCTION}${Term.termList(pTerm.terms || [])})`,
        [OP.PARALLEL_CONJUNCTION]: pTerm => `(${REL.PARALLEL_CONJUNCTION}${Term.termList(pTerm.terms || [])})`,
        [OP.EXTENSIONAL_DIFFERENCE]: pTerm => `(${REL.EXTENSIONAL_DIFFERENCE}${Term.termList(pTerm.terms || [])})`,
        [OP.INTENSIONAL_DIFFERENCE]: pTerm => `(${REL.INTENSIONAL_DIFFERENCE}${Term.termList(pTerm.terms || [])})`,
        [OP.PRODUCT]: pTerm => `(${REL.PRODUCT}${Term.termList(pTerm.terms || [])})`,
        [OP.EXTENSIONAL_SET]: pTerm => `{${Term.termList(pTerm.terms || [])}}`,
        [OP.INTENSIONAL_SET]: pTerm => `[${Term.termList(pTerm.terms || [])}]`,
    };


    setEmbedding(embedding) {
        errorHandler.executeSync(() => {
            if (this.#embeddingRef) {
                EmbeddingStore.release(this.#embeddingRef);
            }
            this.#embeddingRef = isNonEmptyArray(embedding) ? EmbeddingStore.store(this.#key, embedding) : null;
        }, 'setEmbedding');
    }

    formatString() {
        return this.#key;
    }

    getId() {
        return this.#key;
    }

    clone() {
        return errorHandler.executeSync(() => {
            const cloned = super.clone();
            cloned.#componentCache = {};
            return cloned;
        }, 'clone');
    }

    toJSON() {
        return errorHandler.executeSync(() => ({
            key: this.#key,
            embedding: this.embedding,
            complexity: this.#complexity
        }), 'toJSON');
    }

    toString() {
        return this.#key;
    }

    hashCode() {
        return errorHandler.executeSync(() => {
            if (this._hashCode !== undefined) return this._hashCode;
            let hash = 0;
            for (let i = 0; i < this.#key.length; i++) {
                hash = ((hash << 5) - hash) + this.#key.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
            }
            return (this._hashCode = hash);
        }, 'hashCode', 0);
    }

    destroy() {
        errorHandler.executeSync(() => {
            if (this.#embeddingRef) {
                EmbeddingStore.release(this.#embeddingRef);
                this.#embeddingRef = null;
            }
            this.#componentCache = {};
            this.#structure = null;
        }, 'destroy');
    }

    #getStructure() {
        if (this.#structure === null) {
            // For inner operations, return null on failure instead of throwing
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

        // For inner operations, return null on failure instead of going through error handler
        try {
            const componentKey = Term.termKeyInner(termStructure); // Use inner method
            return (this.#componentCache[componentName] = componentKey ? Term.createInner(componentKey) : null);
        } catch {
            return (this.#componentCache[componentName] = null);
        }
    }
    static createInner(key, embedding = [], complexity = 1) {
        // For inner operations, we just return null instead of throwing for invalid keys
        if (typeof key !== 'string' || key.length === 0) {
            return null;
        }

        try {
            return new Term(key, embedding, complexity);
        } catch {
            return null;
        }
    }
}

export default Term;
