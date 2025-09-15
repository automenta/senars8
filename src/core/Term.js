import {parseTerm} from '../parser/parse-utils.js';
import {cosineSimilarity} from '../utils/math.js';
import config from '../config/index.js';
import {warn} from '../utils/logger.js';

/**
 * Term represents a concept or relationship in the knowledge graph.
 * It is the immutable, canonical representation of a concept with its semantic embedding.
 */
class Term {
    #key;
    #embedding;
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
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Invalid key for Term constructor: key must be a non-empty string');
        }

        this.#key = key;
        // Store embedding as a reference to avoid unnecessary copying
        this.#embedding = embedding;
        this.#complexity = complexity;
        this.#structure = null;
        // Use a simple object as cache instead of Map for better performance
        this.#componentCache = {};
    }

    /**
     * Gets the type of the term (e.g., 'Atomic', 'Inheritance', etc.)
     * @returns {string} The term type
     */
    get type() {
        const structure = this.#getStructure();
        return structure ? structure.type : 'Atomic';
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
        if (this.#componentCache.hasOwnProperty('terms')) {
            return this.#componentCache['terms'];
        }

        const structure = this.#getStructure();
        if (!structure || !structure.terms) {
            this.#componentCache['terms'] = null;
            return null;
        }

        try {
            // Use for loop instead of map for better performance
            const termsArray = [];
            for (let i = 0; i < structure.terms.length; i++) {
                const termStructure = structure.terms[i];
                const component = this.#getComponent(`term_${i}`, termStructure);
                termsArray.push(component);
            }
            this.#componentCache['terms'] = termsArray;
            return termsArray;
        } catch (error) {
            this.#componentCache['terms'] = null;
            return null;
        }
    }

    // Getters for private properties
    get key() {
        return this.#key;
    }

    get embedding() {
        return this.#embedding;
    }

    get complexity() {
        return this.#complexity;
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
        if (term1.embedding.length !== term2.embedding.length) {
            return false;
        }

        // Use for loop instead of every for better performance
        for (let i = 0; i < term1.embedding.length; i++) {
            if (Math.abs(term1.embedding[i] - term2.embedding[i]) >= 1e-6) {
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
    static buildTermKey(pTerm) {
        if (!pTerm || !pTerm.type) {
            return '';
        }

        // Use a switch statement for better performance
        switch (pTerm.type) {
            // Atomic terms
            case 'Atomic':
                return pTerm.key;
            case 'IndependentVariable':
                return pTerm.name;
            case 'DependentVariable':
                return `#${pTerm.name}`;
            case 'QueryVariable':
                return `?${pTerm.name}`;

            // Binary relations
            case 'Inheritance':
                return `(${Term.buildTermKey(pTerm.subject)} --> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Implication':
                return `(${Term.buildTermKey(pTerm.subject)} ==> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Equivalence':
                return `(${Term.buildTermKey(pTerm.subject)} <=> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Similarity':
                return `(${Term.buildTermKey(pTerm.subject)} <-> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Instance':
                return `(${Term.buildTermKey(pTerm.subject)} {-- ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Property':
                return `(${Term.buildTermKey(pTerm.subject)} --} ${Term.buildTermKey(pTerm.predicate)})`;
            case 'PredictiveImplication':
                return `(${Term.buildTermKey(pTerm.subject)} =\> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'RetrospectiveImplication':
                return `(${Term.buildTermKey(pTerm.subject)} =/> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'ConcurrentImplication':
                return `(${Term.buildTermKey(pTerm.subject)} =<> ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Until':
                return `(${Term.buildTermKey(pTerm.subject)} until ${Term.buildTermKey(pTerm.predicate)})`;
            case 'Since':
                return `(${Term.buildTermKey(pTerm.subject)} since ${Term.buildTermKey(pTerm.predicate)})`;

            // Unary operators
            case 'Negation':
                return `(--,${Term.buildTermKey(pTerm.term)})`;
            case 'Always':
                return `(always,${Term.buildTermKey(pTerm.term)})`;
            case 'Eventually':
                return `(eventually,${Term.buildTermKey(pTerm.term)})`;
            case 'Next':
                return `(next,${Term.buildTermKey(pTerm.term)})`;
            case 'Previous':
                return `(previous,${Term.buildTermKey(pTerm.term)})`;

            // N-ary operators
            case 'Conjunction':
                return `(&,${Term.buildTermList(pTerm.terms || [])})`;
            case 'Disjunction':
                return `(||,${Term.buildTermList(pTerm.terms || [])})`;
            case 'SequentialConjunction':
                return `(&&,${Term.buildTermList(pTerm.terms || [])})`;
            case 'ParallelConjunction':
                return `(&|,${Term.buildTermList(pTerm.terms || [])})`;
            case 'ExtensionalDifference':
                return `(#,${Term.buildTermList(pTerm.terms || [])})`;
            case 'IntensionalDifference':
                return `(\\\\,${Term.buildTermList(pTerm.terms || [])})`;
            case 'Product':
                return `(*,${Term.buildTermList(pTerm.terms || [])})`;

            // Sets
            case 'ExtensionalSet':
                return `{${Term.buildTermList(pTerm.terms || [])}}`;
            case 'IntensionalSet':
                return `[${Term.buildTermList(pTerm.terms || [])}]`;

            default:
                throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
        }
    }

    /**
     * Builds a comma-separated list of term keys
     * @param {Array} terms - Array of term structures
     * @returns {string} Comma-separated list of term keys
     */
    static buildTermList(terms) {
        // Handle edge cases
        if (!terms || terms.length === 0) {
            return '';
        }
        
        // Use map and join for better readability while maintaining performance
        return terms.map(term => Term.buildTermKey(term)).join(',');
    }

    /**
     * Sets the embedding for this term
     * @param {number[]} embedding - The embedding vector
     */
    setEmbedding(embedding) {
        if (this.#embedding.length > 0) {
            warn(`Overwriting existing embedding for term: ${this.#key}`);
        }
        // Store reference instead of copying for better performance
        this.#embedding = embedding;
    }

    /**
     * Gets the parsed structure of the term
     * @returns {object|null} The parsed structure or null if parsing fails
     * @private
     */
    #getStructure() {
        // Use lazy initialization with caching
        if (this.#structure === null) {
            try {
                this.#structure = parseTerm(this.#key);
            } catch (error) {
                this.#structure = null;
            }
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
        if (this.#componentCache.hasOwnProperty(componentName)) {
            return this.#componentCache[componentName];
        }

        const termStructure = structure || (this.#getStructure() ? this.#getStructure()[componentName] : null);
        if (!termStructure) {
            this.#componentCache[componentName] = null;
            return null;
        }

        try {
            const componentKey = Term.buildTermKey(termStructure);
            if (componentKey) {
                // Create new term and cache it
                const componentTerm = new Term(componentKey);
                this.#componentCache[componentName] = componentTerm;
                return componentTerm;
            }
            this.#componentCache[componentName] = null;
            return null;
        } catch (error) {
            this.#componentCache[componentName] = null;
            return null;
        }
    }

    /**
     * Checks if this term equals another term
     * @param {Term} other - The other term to compare with
     * @returns {boolean} True if the terms are equal
     */
    equals(other) {
        return other instanceof Term && this.#key === other.#key;
    }

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

        // Store cached value
        this._hashCode = hash;
        return hash;
    }

    /**
     * Converts the term to a JSON-serializable object
     * @returns {object} JSON representation of the term
     */
    toJSON() {
        return {
            key: this.#key,
            embedding: this.#embedding,
            complexity: this.#complexity
        };
    }
}

export default Term;
