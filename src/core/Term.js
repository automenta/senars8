const {parseTerm} = require('../parser/narseseParser');
const {buildTermKey} = require('../utils/term-utils');

class Term {
    constructor(key, embedding = [], complexity = 1) {
        // Validate required parameters
        const isValidKey = typeof key === 'string' && key.length > 0;
        
        if (!isValidKey) {
            throw new Error('Invalid key for Term constructor');
        }

        // Initialize core properties
        this.key = key;
        this.embedding = Object.freeze([...embedding]);
        this.complexity = complexity;

        // Parse the term structure and initialize cache
        this._structure = parseTerm(key);
        this._componentCache = {}; // Cache for Term components
    }

    /**
     * Get the type of the term (e.g., 'Atomic', 'Inheritance', 'Implication')
     * @returns {string} The term type
     */
    get type() {
        return this._structure ? this._structure.type : 'Atomic';
    }

    /**
     * Get the subject component of the term (for binary relations)
     * @returns {Term|null} The subject term or null if not applicable
     */
    get subject() {
        return this._getComponent('subject');
    }

    /**
     * Get the predicate component of the term (for binary relations)
     * @returns {Term|null} The predicate term or null if not applicable
     */
    get predicate() {
        return this._getComponent('predicate');
    }

    /**
     * Get the terms component of the term (for compound terms)
     * @returns {Array<Term>|null} Array of term components or null if not applicable
     */
    get terms() {
        // Return null if structure or terms don't exist
        if (!this._structure || !this._structure.terms) return null;
        
        // Create and cache terms array if not already cached
        if (!this._componentCache.terms) {
            this._componentCache.terms = this._structure.terms.map((termStructure, index) => 
                this._getComponent(`term_${index}`, termStructure)
            );
        }
        
        return this._componentCache.terms;
    }

    /**
     * Get a component of the term by name
     * @private
     * @param {string} componentName - Name of the component to retrieve
     * @param {object} [structure] - Optional structure to use instead of the one from _structure
     * @returns {Term|null} The component term or null if not found
     */
    _getComponent(componentName, structure) {
        // Get the structure for this component
        const componentStructure = structure || (this._structure ? this._structure[componentName] : null);
        if (!componentStructure) return null;

        // Create and cache the component term if not already cached
        if (!this._componentCache[componentName]) {
            const componentKey = buildTermKey(componentStructure);
            if (componentKey) {
                this._componentCache[componentName] = new Term(componentKey);
            } else {
                return null;
            }
        }
        
        return this._componentCache[componentName];
    }

    /**
     * Check if this term is equal to another term
     * @param {Term} other - The term to compare with
     * @returns {boolean} True if the terms are equal, false otherwise
     */
    equals(other) {
        return other instanceof Term && this.key === other.key;
    }
}

module.exports = Term;
