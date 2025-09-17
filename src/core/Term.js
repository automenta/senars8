import {parseTerm} from '../parser/parse-utils.js';
import {cosineSimilarity} from '../utils/math.js';
import config from '../config/index.js';
import EmbeddingStore from '../utils/EmbeddingStore.js';
import {OP, REL} from '../config/constants.js';
import {validateString} from '../utils/validation.js';
import BaseEntity from './BaseEntity.js';
import { isNonEmptyArray } from '../utils/arrayUtils.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('Term');

/**
 * Term represents a concept or relationship in the knowledge graph.
 * It is the immutable, canonical representation of a concept with its semantic embedding.
 */
class Term extends BaseEntity {
    #key;
    #embeddingRef; // Reference to embedding in EmbeddingStore instead of direct storage
    #complexity;
    #structure;
    #componentCache;

    /**
     * Creates a new Term instance.
     * @param {string} key - The Narsese key representing the term
     * @param {number[]} [embedding=[]] - The semantic embedding vector
     * @param {number} [complexity=1] - The structural complexity of the term
     */
    constructor(key, embedding = [], complexity = 1) {
        super();
        validateString(key, 'Term key');

        this.#key = key;
        // Store reference to embedding instead of copying the array
        if (isNonEmptyArray(embedding)) {
            this.#embeddingRef = EmbeddingStore.store(key, embedding);
        } else {
            this.#embeddingRef = null;
        }
        this.#complexity = complexity;
        this.#structure = null;
        // Use a simple object as cache instead of Map for better performance
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

    /**
     * Gets the type of the term (e.g., 'Atomic', 'Inheritance', etc.)
     * @returns {string} The term type
     */
    get type() {
        const structure = this.#getStructure();
        return structure ? structure.type : OP.ATOMIC;
    }

    /**
     * Gets the subject component of the term (for binary relations)
     * @returns {Term|null} The subject term or null if not applicable
     */
    get subject() {
        return this.#getComponent('subject');
    }

    /**
     * Gets the predicate component of the term (for binary relations)
     * @returns {Term|null} The predicate term or null if not applicable
     */
    get predicate() {
        return this.#getComponent('predicate');
    }

    /**
     * Gets the terms component of the term (for n-ary operators)
     * @returns {Term[]|null} Array of term components or null if not applicable
     */
    get terms() {
        // Check cache first
        if (Object.hasOwn(this.#componentCache, 'terms')) {
            return this.#componentCache['terms'];
        }

        const structure = this.#getStructure();
        if (!structure || !structure.terms) {
            this.#componentCache['terms'] = null;
            return null;
        }

        return errorHandler.safeSync(() => {
            // Use for loop instead of map for better performance
            const termsArray = [];
            for (let i = 0; i < structure.terms.length; i++) {
                const termStructure = structure.terms[i];
                const component = this.#getComponent(`term_${i}`, termStructure);
                termsArray.push(component);
            }
            this.#componentCache['terms'] = termsArray;
            return termsArray;
        }, 'get-terms', null);
    }

    /**
     * Checks if two terms are equal
     * @param {Term} term1 - First term
     * @param {Term} term2 - Second term
     * @returns {boolean} True if terms are equal
     */
    static termsEqual(term1, term2) {
        // Fast path checks
        if (term1 === term2) {
            return true;
        }
        if (!term1 || !term2) {
            return false;
        }
        if (term1.key !== term2.key) {
            return false;
        }
        if (term1.complexity !== term2.complexity) {
            return false;
        }

        // Use getters to access embeddings
        const embedding1 = term1.embedding;
        const embedding2 = term2.embedding;

        if (embedding1.length !== embedding2.length) {
            return false;
        }

        // Use for loop instead of every for better performance
        for (let i = 0; i < embedding1.length; i++) {
            if (Math.abs(embedding1[i] - embedding2[i]) >= 1e-6) {
                return false;
            }
        }

        return true;
    }

    /**
     * Creates a Term from a JSON object
     * @param {object} json - JSON representation of a term
     * @returns {Term|null} The created term or null if invalid
     */
    static fromJSON(json) {
        if (!json || !json.key) {
            return null;
        }
        return new Term(json.key, json.embedding, json.complexity);
    }

    /**
     * Builds a term key from a parsed term structure
     * @param {object} pTerm - Parsed term structure
     * @returns {string} The term key
     */
    static termKey(pTerm) {
        if (!pTerm || !pTerm.type) {
            return '';
        }

        // Use a switch statement for better performance
        switch (pTerm.type) {
            // Atomic terms
            case OP.ATOMIC:
                return pTerm.key;
            case OP.INDEPENDENT_VARIABLE:
                return pTerm.name;
            case OP.DEPENDENT_VARIABLE:
                return `#${pTerm.name}`;
            case OP.QUERY_VARIABLE:
                return `?${pTerm.name}`;

            // Binary relations
            case OP.INHERITANCE:
                return this.termKeyInfix(pTerm, REL.INHERITANCE);
            case OP.IMPLICATION:
                return this.termKeyInfix(pTerm, REL.IMPLICATION);
            case OP.EQUIVALENCE:
                return this.termKeyInfix(pTerm, REL.EQUIVALENCE);
            case OP.SIMILARITY:
                return this.termKeyInfix(pTerm, REL.SIMILARITY);
            case OP.INSTANCE:
                return `(${Term.termKey(pTerm.subject)} ${REL.INSTANCE} ${Term.termKey(pTerm.predicate)})`;
            case OP.PROPERTY:
                return `(${Term.termKey(pTerm.subject)} ${REL.PROPERTY} ${Term.termKey(pTerm.predicate)})`;
            case OP.PREDICTIVE_IMPLICATION:
                return `(${Term.termKey(pTerm.subject)} ${REL.PREDICTIVE_IMPLICATION} ${Term.termKey(pTerm.predicate)})`;
            case OP.RETROSPECTIVE_IMPLICATION:
                return `(${Term.termKey(pTerm.subject)} ${REL.RETROSPECTIVE_IMPLICATION} ${Term.termKey(pTerm.predicate)})`;
            case OP.CONCURRENT_IMPLICATION:
                return `(${Term.termKey(pTerm.subject)} ${REL.CONCURRENT_IMPLICATION} ${Term.termKey(pTerm.predicate)})`;
            case OP.UNTIL:
                return `(${Term.termKey(pTerm.subject)} until ${Term.termKey(pTerm.predicate)})`;
            case OP.SINCE:
                return `(${Term.termKey(pTerm.subject)} since ${Term.termKey(pTerm.predicate)})`;

            // Unary operators
            case OP.NEGATION:
                return `(${REL.NEGATION}${Term.termKey(pTerm.term)})`;
            case OP.ALWAYS:
                return `(${REL.ALWAYS}${Term.termKey(pTerm.term)})`;
            case OP.EVENTUALLY:
                return `(${REL.EVENTUALLY}${Term.termKey(pTerm.term)})`;
            case OP.NEXT:
                return `(${REL.NEXT}${Term.termKey(pTerm.term)})`;
            case OP.PREVIOUS:
                return `(${REL.PREVIOUS}${Term.termKey(pTerm.term)})`;

            // N-ary operators
            case OP.CONJUNCTION:
                return `(${REL.CONJUNCTION}${Term.termList(pTerm.terms || [])})`;
            case OP.DISJUNCTION:
                return `(${REL.DISJUNCTION}${Term.termList(pTerm.terms || [])})`;
            case OP.SEQUENTIAL_CONJUNCTION:
                return `(${REL.SEQUENTIAL_CONJUNCTION}${Term.termList(pTerm.terms || [])})`;
            case OP.PARALLEL_CONJUNCTION:
                return `(${REL.PARALLEL_CONJUNCTION}${Term.termList(pTerm.terms || [])})`;
            case OP.EXTENSIONAL_DIFFERENCE:
                return `(${REL.EXTENSIONAL_DIFFERENCE}${Term.termList(pTerm.terms || [])})`;
            case OP.INTENSIONAL_DIFFERENCE:
                return `(${REL.INTENSIONAL_DIFFERENCE}${Term.termList(pTerm.terms || [])})`;
            case OP.PRODUCT:
                return `(${REL.PRODUCT}${Term.termList(pTerm.terms || [])})`;

            // Sets
            case OP.EXTENSIONAL_SET:
                return `{${Term.termList(pTerm.terms || [])}}`;
            case OP.INTENSIONAL_SET:
                return `[${Term.termList(pTerm.terms || [])}]`;

            default:
                throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
        }
    }

    static termKeyInfix(pTerm, op) {
        return `(${Term.termKey(pTerm.subject)} ${op} ${Term.termKey(pTerm.predicate)})`;
    }

    /**
     * Builds a comma-separated list of term keys
     * @param {Array} terms - Array of term structures
     * @returns {string} Comma-separated list of term keys
     */
    static termList(terms) {
        // Handle edge cases
        if (!terms || terms.length === 0) {
            return '';
        }

        // Use map and join for better readability while maintaining performance
        return terms.map(term => Term.termKey(term)).join(',');
    }

    /**
     * Calculates structural similarity between two term keys
     * @param {string} termKey1 - First term key
     * @param {string} termKey2 - Second term key
     * @returns {number} Similarity score between 0 and 1
     */
    static structuralSimilarity(termKey1, termKey2) {
        // Fast path for identical terms
        if (termKey1 === termKey2) {
            return 1.0;
        }

        // Use a more efficient algorithm for substring comparison
        const len1 = termKey1.length;
        const len2 = termKey2.length;

        // If either string is too short, return 0
        if (len1 < 2 || len2 < 2) {
            // Special case for very short strings with some overlap
            if (len1 > 0 && len2 > 0 && len1 <= 2 && len2 <= 2) {
                // For strings of length 1 or 2, check character overlap
                let commonChars = 0;
                for (let i = 0; i < len1; i++) {
                    if (termKey2.includes(termKey1[i])) {
                        commonChars++;
                    }
                }
                return Math.min(commonChars / Math.max(len1, len2), 1.0);
            }
            return 0;
        }

        // Count common bigrams using arrays for better performance
        const bigrams1 = new Array(len1 - 1);
        const bigrams2 = new Array(len2 - 1);

        for (let i = 0; i < len1 - 1; i++) {
            bigrams1[i] = termKey1.substring(i, i + 2);
        }

        for (let i = 0; i < len2 - 1; i++) {
            bigrams2[i] = termKey2.substring(i, i + 2);
        }

        // Count intersections
        let intersection = 0;
        const bigramSet = new Set(bigrams1);

        for (let i = 0; i < bigrams2.length; i++) {
            if (bigramSet.has(bigrams2[i])) {
                intersection++;
                // Remove to handle duplicates correctly
                bigramSet.delete(bigrams2[i]);
            }
        }

        const totalLength = bigrams1.length + bigrams2.length;
        return totalLength > 0 ? (2 * intersection) / totalLength : 0;
    }

    /**
     * Finds similar terms based on semantic and structural similarity
     * @param {Map<string, Term>} terms - Map of all terms
     * @param {string} targetTermKey - Key of the target term
     * @param {number} [maxResults=10] - Maximum number of results to return
     * @returns {Array<{termKey: string, similarity: number}>} Array of similar terms with similarity scores
     */
    static findSimilarTerms(terms, targetTermKey, maxResults = 10) {
        const targetTerm = terms.get(targetTermKey);
        if (!targetTerm || !targetTerm.embedding) {
            return [];
        }

        // Pre-calculate weights to avoid repeated lookups
        const regularityBoost = config.temporal.REGULARITY_BOOST;
        const structuralWeight = config.temporal.STRUCTURAL_SIMILARITY_WEIGHT;

        // Convert map to array for more efficient processing
        const termEntries = Array.from(terms.entries());
        const similarities = [];

        for (let i = 0; i < termEntries.length; i++) {
            const [key, term] = termEntries[i];

            // Skip target term and terms without embeddings
            if (key === targetTermKey || !term.embedding) {
                continue;
            }

            const semantic = cosineSimilarity(targetTerm.embedding, term.embedding);
            const structural = Term.structuralSimilarity(targetTermKey, key);
            const similarity = regularityBoost * semantic + structuralWeight * structural;

            similarities.push({
                termKey: key,
                similarity
            });
        }

        // Sort and slice using more efficient methods
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, maxResults);
    }

    /**
     * Sets the embedding for this term
     * @param {number[]} embedding - The embedding vector
     */
    setEmbedding(embedding) {
        if (this.#embeddingRef) {
            EmbeddingStore.release(this.#embeddingRef);
        }
        if (embedding.length > 0) {
            this.#embeddingRef = EmbeddingStore.store(this.#key, embedding);
        } else {
            this.#embeddingRef = null;
        }
    }

    formatString() {
        return this.#key;
    }

    getId() {
        return this.#key;
    }

    clone() {
        const cloned = super.clone();
        cloned.#componentCache = {};
        return cloned;
    }

    toJSON() {
        return {
            key: this.#key,
            embedding: this.embedding, // Get embedding from shared store
            complexity: this.#complexity
        };
    }

    /* STATIC METHODS */

    /**
     * Returns a string representation of the term
     * @returns {string} String representation of the term
     */
    toString() {
        return this.#key;
    }

    /**
     * Calculates a hash code for the term
     * @returns {number} Hash code
     */
    hashCode() {
        // Cache hash code for better performance
        if (this._hashCode !== undefined) {
            return this._hashCode;
        }

        let hash = 0;
        for (let i = 0; i < this.#key.length; i++) {
            const char = this.#key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return this._hashCode = hash; // Store cached value
    }

    /**
     * Releases resources held by this term
     */
    destroy() {
        if (this.#embeddingRef) {
            EmbeddingStore.release(this.#embeddingRef);
            this.#embeddingRef = null;
        }
        this.#componentCache = {};
        this.#structure = null;
    }

    /**
     * Gets the parsed structure of the term
     * @returns {object|null} The parsed structure or null if parsing fails
     * @private
     */
    #getStructure() {
        // Use lazy initialization with caching
        if (this.#structure === null) {
            this.#structure = errorHandler.safeSync(() => parseTerm(this.#key), 'get-structure', null);
        }
        return this.#structure;
    }

    /**
     * Gets a component of the term
     * @param {string} componentName - Name of the component to get
     * @param {object} [structure] - Optional structure to use
     * @returns {Term|null} The component term or null if not found
     * @private
     */
    #getComponent(componentName, structure) {
        // Check cache first
        const cache = this.#componentCache;

        if (Object.hasOwn(cache, componentName)) {
            return cache[componentName];
        }

        const termStructure = structure || this.#componentStructure(componentName);
        if (!termStructure) {
            cache[componentName] = null;
            return null;
        }

        const componentTerm = errorHandler.safeSync(() => {
            const componentKey = Term.termKey(termStructure);
            if (componentKey) {
                // Create new term and cache it
                return new Term(componentKey);
            }
            return null;
        }, 'get-component', null);

        cache[componentName] = componentTerm;
        return componentTerm;
    }

    #componentStructure(componentName) {
        const s = this.#getStructure();
        return s ? s[componentName] : null;
    }
}

export default Term;
