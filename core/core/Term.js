import {parseTerm} from '../parser/parse-utils.js';
import {embeddingsEqual} from '../utils/math.js';
import EmbeddingStore from '../utils/embeddingStore.js';
import {OP, REL} from '../config/constants.js';
import * as validation from '../utils/validation.js';
import BaseEntity from './BaseEntity.js';
import {isNonEmptyArray} from '../utils/collections/index.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('Term');

// Key builder helpers
const termKeyInfix = (pTerm, op, silent) => `(${Term.termKey(pTerm.subject, silent)} ${op} ${Term.termKey(pTerm.predicate, silent)})`;
const termList = (terms, silent) => (terms?.length ? terms.map(t => Term.termKey(t, silent)).join(',') : '');
const unaryOp = (op, pTerm, silent) => `(${op}${Term.termKey(pTerm.term, silent)})`;
const listOp = (op, pTerm, silent) => `(${op}${termList(pTerm.terms || [], silent)})`;

const keyBuilder = {
    [OP.ATOMIC]: pTerm => pTerm.key,
    [OP.INDEPENDENT_VARIABLE]: pTerm => pTerm.name,
    [OP.DEPENDENT_VARIABLE]: pTerm => `#${pTerm.name}`,
    [OP.QUERY_VARIABLE]: pTerm => `?${pTerm.name}`,
    [OP.INHERITANCE]: (pTerm, silent) => termKeyInfix(pTerm, REL.INHERITANCE, silent),
    [OP.IMPLICATION]: (pTerm, silent) => termKeyInfix(pTerm, REL.IMPLICATION, silent),
    [OP.EQUIVALENCE]: (pTerm, silent) => termKeyInfix(pTerm, REL.EQUIVALENCE, silent),
    [OP.SIMILARITY]: (pTerm, silent) => termKeyInfix(pTerm, REL.SIMILARITY, silent),
    [OP.INSTANCE]: (pTerm, silent) => termKeyInfix(pTerm, REL.INSTANCE, silent),
    [OP.PROPERTY]: (pTerm, silent) => termKeyInfix(pTerm, REL.PROPERTY, silent),
    [OP.PREDICTIVE_IMPLICATION]: (pTerm, silent) => termKeyInfix(pTerm, REL.PREDICTIVE_IMPLICATION, silent),
    [OP.RETROSPECTIVE_IMPLICATION]: (pTerm, silent) => termKeyInfix(pTerm, REL.RETROSPECTIVE_IMPLICATION, silent),
    [OP.CONCURRENT_IMPLICATION]: (pTerm, silent) => termKeyInfix(pTerm, REL.CONCURRENT_IMPLICATION, silent),
    [OP.UNTIL]: (pTerm, silent) => termKeyInfix(pTerm, 'until', silent),
    [OP.SINCE]: (pTerm, silent) => termKeyInfix(pTerm, 'since', silent),
    [OP.NEGATION]: (pTerm, silent) => unaryOp(REL.NEGATION, pTerm, silent),
    [OP.ALWAYS]: (pTerm, silent) => unaryOp(REL.ALWAYS, pTerm, silent),
    [OP.EVENTUALLY]: (pTerm, silent) => unaryOp(REL.EVENTUALLY, pTerm, silent),
    [OP.NEXT]: (pTerm, silent) => unaryOp(REL.NEXT, pTerm, silent),
    [OP.PREVIOUS]: (pTerm, silent) => unaryOp(REL.PREVIOUS, pTerm, silent),
    [OP.CONJUNCTION]: (pTerm, silent) => listOp(REL.CONJUNCTION, pTerm, silent),
    [OP.DISJUNCTION]: (pTerm, silent) => listOp(REL.DISJUNCTION, pTerm, silent),
    [OP.SEQUENTIAL_CONJUNCTION]: (pTerm, silent) => listOp(REL.SEQUENTIAL_CONJUNCTION, pTerm, silent),
    [OP.PARALLEL_CONJUNCTION]: (pTerm, silent) => listOp(REL.PARALLEL_CONJUNCTION, pTerm, silent),
    [OP.EXTENSIONAL_DIFFERENCE]: (pTerm, silent) => listOp(REL.EXTENSIONAL_DIFFERENCE, pTerm, silent),
    [OP.INTENSIONAL_DIFFERENCE]: (pTerm, silent) => listOp(REL.INTENSIONAL_DIFFERENCE, pTerm, silent),
    [OP.PRODUCT]: (pTerm, silent) => listOp(REL.PRODUCT, pTerm, silent),
    [OP.EXTENSIONAL_SET]: (pTerm, silent) => `{${termList(pTerm.terms || [], silent)}}`,
    [OP.INTENSIONAL_SET]: (pTerm, silent) => `[${termList(pTerm.terms || [], silent)}]`,
};

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
        if (Object.hasOwn(this.#componentCache, 'terms')) return this.#componentCache.terms;

        const structure = this.#getStructure();
        if (!structure?.terms) return (this.#componentCache.terms = null);

        return errorHandler.executeSync(() => {
            return (this.#componentCache.terms = structure.terms.map((term, i) => this.#getComponent(`term_${i}`, term)));
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

    static termKey(pTerm, silent = false) {
        if (!pTerm?.type) {
            if (silent) return '';
            return errorHandler.executeSync(() => '', 'termKey', '');
        }

        const builder = keyBuilder[pTerm.type];
        if (builder) {
            if (silent) {
                try {
                    return builder(pTerm, true);
                } catch {
                    return '';
                }
            }
            return errorHandler.executeSync(() => builder(pTerm, false), 'termKey', '');
        }

        if (silent) return '';
        throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
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
            const componentKey = Term.termKey(termStructure, true); // Use silent option
            return (this.#componentCache[componentName] = componentKey ? Term.createInner(componentKey) : null);
        } catch {
            return (this.#componentCache[componentName] = null);
        }
    }
}

export default Term;