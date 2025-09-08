const {parseTerm} = require('../parser/narseseParser');
const {buildTermKey} = require('../utils/term-utils');

/**
 * Represents a term in the cognitive architecture
 * 
 * A term is a symbolic representation that can be atomic (like 'cat') or 
 * compound (like '(cat --> animal)'). Terms can have embeddings for 
 * semantic similarity calculations and complexity measures.
 * 
 * Terms form the vocabulary of the cognitive system and are immutable once created.
 * They are the nodes in the knowledge hypergraph, with tasks representing beliefs,
 * goals, and questions about these terms.
 * 
 * @class Term
 */
class Term {
    /**
     * Create a new Term
     * 
     * @param {string} key - The term key (e.g., 'cat' or '(cat --> animal)')
     *   This is the canonical string representation of the term in Narsese syntax
     * @param {number[]} [embedding=[]] - Vector embedding for semantic similarity
     *   A dense vector representation from language models for semantic computations
     * @param {number} [complexity=1] - Complexity measure of the term
     *   A measure of the structural complexity, used in economic attention calculations
     * 
     * @throws {Error} If key is not a non-empty string
     * 
     * @example
     * // Create an atomic term
     * const term1 = new Term('cat');
     * 
     * @example
     * // Create a compound term with embedding and complexity
     * const term2 = new Term('(cat --> animal)', [0.1, 0.5, 0.3], 3);
     * 
     * @example
     * // Create a complex term
     * const term3 = new Term('(&&, (cat --> pet), (dog --> pet))');
     */
    constructor(key, embedding = [], complexity = 1) {
        // Validate required parameters
        const isValidKey = typeof key === 'string' && key.length > 0;
        
        if (!isValidKey) {
            throw new Error('Invalid key for Term constructor: key must be a non-empty string');
        }

        // Initialize core properties
        this.key = key;
        this.embedding = Object.freeze([...embedding]);
        this.complexity = complexity;

        // Lazy initialization of structure and cache
        this._structure = null;
        this._componentCache = new Map(); // Use Map for better performance and clearer semantics
    }

    /**
     * Get the parsed structure of the term, parsing it on first access
     * 
     * This method parses the term key using the Narsese parser and caches
     * the result for future access. Parsing is done lazily to avoid unnecessary
     * computation for terms that are not structurally analyzed.
     * 
     * @private
     * @returns {object|null} The parsed term structure or null if parsing fails
     */
    _getStructure() {
        if (this._structure === null) {
            try {
                this._structure = parseTerm(this.key);
            } catch (error) {
                // If parsing fails, cache null to avoid repeated failed attempts
                this._structure = null;
            }
        }
        return this._structure;
    }

    /**
     * Get the type of the term (e.g., 'Atomic', 'Inheritance', 'Implication')
     * 
     * The type is determined by parsing the term key. For example:
     * - 'cat' has type 'Atomic'
     * - '(cat --> animal)' has type 'Inheritance'
     * - '(cat ==> animal)' has type 'Implication'
     * 
     * @returns {string} The term type
     * 
     * @example
     * const term = new Term('(cat --> animal)');
     * console.log(term.type); // 'Inheritance'
     */
    get type() {
        const structure = this._getStructure();
        return structure ? structure.type : 'Atomic';
    }

    /**
     * Get the subject component of the term (for binary relations)
     * 
     * For terms like '(cat --> animal)', this returns the 'cat' component.
     * For atomic terms or terms without a subject, returns null.
     * 
     * @returns {Term|null} The subject term or null if not applicable
     * 
     * @example
     * const term = new Term('(cat --> animal)');
     * const subject = term.subject; // Term with key 'cat'
     */
    get subject() {
        return this._getComponent('subject');
    }

    /**
     * Get the predicate component of the term (for binary relations)
     * 
     * For terms like '(cat --> animal)', this returns the 'animal' component.
     * For atomic terms or terms without a predicate, returns null.
     * 
     * @returns {Term|null} The predicate term or null if not applicable
     * 
     * @example
     * const term = new Term('(cat --> animal)');
     * const predicate = term.predicate; // Term with key 'animal'
     */
    get predicate() {
        return this._getComponent('predicate');
    }

    /**
     * Get the terms component of the term (for compound terms)
     * 
     * For terms like '(cat & dog)', this returns an array with 'cat' and 'dog' components.
     * For atomic terms or terms without sub-terms, returns null.
     * 
     * @returns {Array<Term>|null} Array of term components or null if not applicable
     * 
     * @example
     * const term = new Term('(cat & dog)');
     * const terms = term.terms; // Array with Term objects for 'cat' and 'dog'
     */
    get terms() {
        // Return cached terms if they exist
        if (this._componentCache.has('terms')) {
            return this._componentCache.get('terms');
        }

        const structure = this._getStructure();
        // Return null if structure or terms don't exist
        if (!structure || !structure.terms) {
            this._componentCache.set('terms', null);
            return null;
        }
        
        // Create and cache terms array
        try {
            const termsArray = structure.terms.map((termStructure, index) => 
                this._getComponent(`term_${index}`, termStructure)
            );
            this._componentCache.set('terms', termsArray);
            return termsArray;
        } catch (error) {
            this._componentCache.set('terms', null);
            return null;
        }
    }

    /**
     * Get a component of the term by name
     * 
     * This method retrieves a component of the term by name, creating and caching
     * a Term object for it if it doesn't already exist. Components are cached
     * to avoid repeated parsing and Term creation.
     * 
     * @private
     * @param {string} componentName - Name of the component to retrieve
     * @param {object} [structure] - Optional structure to use instead of the one from _structure
     * @returns {Term|null} The component term or null if not found
     */
    _getComponent(componentName, structure) {
        // Return cached component if it exists
        if (this._componentCache.has(componentName)) {
            return this._componentCache.get(componentName);
        }

        const termStructure = structure || (this._getStructure() ? this._getStructure()[componentName] : null);
        if (!termStructure) {
            // Cache null for missing components to avoid repeated lookups
            this._componentCache.set(componentName, null);
            return null;
        }

        // Create and cache the component term
        try {
            const componentKey = buildTermKey(termStructure);
            if (componentKey) {
                const componentTerm = new Term(componentKey);
                this._componentCache.set(componentName, componentTerm);
                return componentTerm;
            } else {
                this._componentCache.set(componentName, null);
                return null;
            }
        } catch (error) {
            // Cache null for failed component creation to avoid repeated attempts
            this._componentCache.set(componentName, null);
            return null;
        }
    }

    /**
     * Check if this term is equal to another term
     * 
     * Two terms are equal if they are both Term instances and have the same key.
     * This comparison is based on the string representation of the terms.
     * 
     * @param {Term} other - The term to compare with
     * @returns {boolean} True if the terms are equal, false otherwise
     * 
     * @example
     * const term1 = new Term('cat');
     * const term2 = new Term('cat');
     * console.log(term1.equals(term2)); // true
     */
    equals(other) {
        return other instanceof Term && this.key === other.key;
    }

    /**
     * Get a string representation of the term
     * 
     * @returns {string} String representation of the term
     */
    toString() {
        return this.key;
    }

    /**
     * Get the hash code of the term
     * 
     * @returns {number} Hash code of the term
     */
    hashCode() {
        let hash = 0;
        for (let i = 0; i < this.key.length; i++) {
            const char = this.key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}

module.exports = Term;
