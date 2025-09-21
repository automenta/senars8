import {parseTerm} from '../parser/parse-utils.js';
import {cosineSimilarity, embeddingsEqual} from '../utils/math.js';
import config from '../config/index.js';
import EmbeddingStore from '../utils/EmbeddingStore.js';
import {OP, REL} from '../config/constants.js';
import {Validation} from '../utils/validation.js';
import BaseEntity from './BaseEntity.js';
import {isNonEmptyArray} from '../utils/collections/index.js';
import {createUnifiedErrorHandler} from '../utils/error.js';
import {tokenize} from '../parser/lexer.js';

const errorHandler = createUnifiedErrorHandler('Term');

class Term extends BaseEntity {
    #key;
    #embeddingRef;
    #complexity;
    #structure;
    #componentCache;

    constructor(key, embedding = [], complexity = 1) {
        super();
        Validation.string(key, 'Term key');

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
        // Handle the unsupported type case outside of error handler so it can throw
        if (pTerm?.type) {
            const keyBuilder = {
                [OP.ATOMIC]: () => pTerm.key,
                [OP.INDEPENDENT_VARIABLE]: () => pTerm.name,
                [OP.DEPENDENT_VARIABLE]: () => `#${pTerm.name}`,
                [OP.QUERY_VARIABLE]: () => `?${pTerm.name}`,
                [OP.INHERITANCE]: () => this.termKeyInfix(pTerm, REL.INHERITANCE),
                [OP.IMPLICATION]: () => this.termKeyInfix(pTerm, REL.IMPLICATION),
                [OP.EQUIVALENCE]: () => this.termKeyInfix(pTerm, REL.EQUIVALENCE),
                [OP.SIMILARITY]: () => this.termKeyInfix(pTerm, REL.SIMILARITY),
                [OP.INSTANCE]: () => `(${Term.termKey(pTerm.subject)} ${REL.INSTANCE} ${Term.termKey(pTerm.predicate)})`,
                [OP.PROPERTY]: () => `(${Term.termKey(pTerm.subject)} ${REL.PROPERTY} ${Term.termKey(pTerm.predicate)})`,
                [OP.PREDICTIVE_IMPLICATION]: () => `(${Term.termKey(pTerm.subject)} ${REL.PREDICTIVE_IMPLICATION} ${Term.termKey(pTerm.predicate)})`,
                [OP.RETROSPECTIVE_IMPLICATION]: () => `(${Term.termKey(pTerm.subject)} ${REL.RETROSPECTIVE_IMPLICATION} ${Term.termKey(pTerm.predicate)})`,
                [OP.CONCURRENT_IMPLICATION]: () => `(${Term.termKey(pTerm.subject)} ${REL.CONCURRENT_IMPLICATION} ${Term.termKey(pTerm.predicate)})`,
                [OP.UNTIL]: () => `(${Term.termKey(pTerm.subject)} until ${Term.termKey(pTerm.predicate)})`,
                [OP.SINCE]: () => `(${Term.termKey(pTerm.subject)} since ${Term.termKey(pTerm.predicate)})`,
                [OP.NEGATION]: () => `(${REL.NEGATION}${Term.termKey(pTerm.term)})`,
                [OP.ALWAYS]: () => `(${REL.ALWAYS}${Term.termKey(pTerm.term)})`,
                [OP.EVENTUALLY]: () => `(${REL.EVENTUALLY}${Term.termKey(pTerm.term)})`,
                [OP.NEXT]: () => `(${REL.NEXT}${Term.termKey(pTerm.term)})`,
                [OP.PREVIOUS]: () => `(${REL.PREVIOUS}${Term.termKey(pTerm.term)})`,
                [OP.CONJUNCTION]: () => `(${REL.CONJUNCTION}${Term.termList(pTerm.terms || [])})`,
                [OP.DISJUNCTION]: () => `(${REL.DISJUNCTION}${Term.termList(pTerm.terms || [])})`,
                [OP.SEQUENTIAL_CONJUNCTION]: () => `(${REL.SEQUENTIAL_CONJUNCTION}${Term.termList(pTerm.terms || [])})`,
                [OP.PARALLEL_CONJUNCTION]: () => `(${REL.PARALLEL_CONJUNCTION}${Term.termList(pTerm.terms || [])})`,
                [OP.EXTENSIONAL_DIFFERENCE]: () => `(${REL.EXTENSIONAL_DIFFERENCE}${Term.termList(pTerm.terms || [])})`,
                [OP.INTENSIONAL_DIFFERENCE]: () => `(${REL.INTENSIONAL_DIFFERENCE}${Term.termList(pTerm.terms || [])})`,
                [OP.PRODUCT]: () => `(${REL.PRODUCT}${Term.termList(pTerm.terms || [])})`,
                [OP.EXTENSIONAL_SET]: () => `{${Term.termList(pTerm.terms || [])}}`,
                [OP.INTENSIONAL_SET]: () => `[${Term.termList(pTerm.terms || [])}]`,
            };

            if (keyBuilder[pTerm.type]) {
                // Only wrap supported operations in error handler
                return errorHandler.executeSync(() => keyBuilder[pTerm.type](), 'termKey', '');
            }

            // Throw error for unsupported types without wrapping in error handler
            throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
        }

        // Handle null/undefined cases with error handler
        return errorHandler.executeSync(() => '', 'termKey', '');
    }

    static termKeyInfix(pTerm, op) {
        return errorHandler.executeSync(() => {
            return `(${Term.termKey(pTerm.subject)} ${op} ${Term.termKey(pTerm.predicate)})`;
        }, 'termKeyInfix', '');
    }

    static termList(terms) {
        return errorHandler.executeSync(() => {
            return terms?.length ? terms.map(term => Term.termKey(term)).join(',') : '';
        }, 'termList', '');
    }

    static structuralSimilarity(termKey1, termKey2) {
        return errorHandler.executeSync(() => {
            // Early return for identical strings
            if (termKey1 === termKey2) {
                return 1.0;
            }

            const tokens1 = tokenize(termKey1);
            const tokens2 = tokenize(termKey2);

            // Optimize for single token case
            if (tokens1.length === 1 && tokens2.length === 1) {
                const len1 = termKey1.length;
                const len2 = termKey2.length;
                if (len1 < 2 || len2 < 2) return 0;

                const bigrams1 = new Set();
                for (let i = 0; i < len1 - 1; i++) {
                    bigrams1.add(termKey1.substring(i, i + 2));
                }

                let intersection = 0;
                for (let i = 0; i < len2 - 1; i++) {
                    if (bigrams1.has(termKey2.substring(i, i + 2))) {
                        intersection++;
                    }
                }

                return (2 * intersection) / (len1 + len2 - 2);
            }

            // Handle empty cases
            if (tokens1.length === 0 && tokens2.length === 0) {
                return 1.0;
            }
            if (tokens1.length === 0 || tokens2.length === 0) {
                return 0.0;
            }

            // Use Maps for O(1) lookup instead of arrays
            const map1 = new Map();
            for (const token of tokens1) {
                map1.set(token, (map1.get(token) || 0) + 1);
            }

            const map2 = new Map();
            for (const token of tokens2) {
                map2.set(token, (map2.get(token) || 0) + 1);
            }

            // Calculate intersection more efficiently
            let intersection = 0;
            for (const [token, count1] of map1) {
                const count2 = map2.get(token);
                if (count2) {
                    intersection += Math.min(count1, count2);
                }
            }

            return (2 * intersection) / (tokens1.length + tokens2.length);
        }, 'structuralSimilarity', 0);
    }

    static findSimilarTerms(terms, targetTermKey, maxResults = 10) {
        return errorHandler.executeSync(() => {
            const targetTerm = terms.get(targetTermKey);
            if (!targetTerm?.embedding) return [];

            const {
                REGULARITY_BOOST,
                STRUCTURAL_SIMILARITY_WEIGHT
            } = config.temporal;

            // Pre-filter terms that have embeddings for better performance
            const termEntries = [];
            for (const [key, term] of terms.entries()) {
                if (key !== targetTermKey && term.embedding) {
                    termEntries.push([key, term]);
                }
            }

            // Use map for better performance than chained array methods
            const similarities = [];
            for (const [key, term] of termEntries) {
                const semantic = cosineSimilarity(targetTerm.embedding, term.embedding);
                const structural = Term.structuralSimilarity(targetTermKey, key);
                similarities.push({
                    termKey: key,
                    similarity: REGULARITY_BOOST * semantic + STRUCTURAL_SIMILARITY_WEIGHT * structural
                });
            }

            // Sort and slice in one operation for better performance
            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, maxResults);
        }, 'findSimilarTerms', []);
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
            this.#structure = errorHandler.executeSync(() => parseTerm(this.#key), 'get-structure', undefined) || null;
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

        const componentTerm = errorHandler.executeSync(() => {
            const componentKey = Term.termKey(termStructure);
            return componentKey ? new Term(componentKey) : null;
        }, 'get-component', null);

        return (this.#componentCache[componentName] = componentTerm);
    }
}

export default Term;
