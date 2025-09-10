import {parseTerm} from '../parser/narseseParser.js';
import {cosineSimilarity} from '../utils/math.js';
import config from '../config.js';

class Term {
    constructor(key, embedding = [], complexity = 1) {
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Invalid key for Term constructor: key must be a non-empty string');
        }

        this.key = key;
        this.embedding = [...embedding];
        this.complexity = complexity;
        this._structure = null;
        this._componentCache = new Map();
    }

    setEmbedding(embedding) {
        if (this.embedding.length > 0) {
            console.warn(`Overwriting existing embedding for term: ${this.key}`);
        }
        this.embedding = [...embedding];
    }

    get type() {
        const structure = this._getStructure();
        return structure ? structure.type : 'Atomic';
    }

    get subject() {
        return this._getComponent('subject');
    }

    get predicate() {
        return this._getComponent('predicate');
    }

    get terms() {
        if (this._componentCache.has('terms')) {
            return this._componentCache.get('terms');
        }

        const structure = this._getStructure();
        if (!structure || !structure.terms) {
            this._componentCache.set('terms', null);
            return null;
        }

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

    static structuralSimilarity(termKey1, termKey2) {
        if (termKey1 === termKey2) return 1.0;

        const getSubstrings = (str) => {
            const substrings = new Set();
            for (let i = 0; i < str.length - 1; i++) {
                substrings.add(str.substring(i, i + 2));
            }
            return substrings;
        };

        const subs1 = getSubstrings(termKey1);
        const subs2 = getSubstrings(termKey2);
        const intersection = new Set([...subs1].filter(sub => subs2.has(sub)));

        const totalLength = subs1.size + subs2.size;
        return totalLength > 0 ? (2 * intersection.size) / totalLength : 0;
    }

    static findSimilarTerms(terms, targetTermKey, maxResults = 10) {
        const targetTerm = terms.get(targetTermKey);
        if (!targetTerm || !targetTerm.embedding) return [];

        const similarities = Array.from(terms.entries())
            .filter(([key, term]) => key !== targetTermKey && term.embedding)
            .map(([key, term]) => {
                const semantic = cosineSimilarity(targetTerm.embedding, term.embedding);
                const structural = Term.structuralSimilarity(targetTermKey, key);
                return {
                    termKey: key,
                    similarity: config.temporal.REGULARITY_BOOST * semantic +
                        config.temporal.STRUCTURAL_SIMILARITY_WEIGHT * structural
                };
            });

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }

    static termsEqual(term1, term2) {
        return term1.key === term2.key &&
            term1.complexity === term2.complexity &&
            term1.embedding.length === term2.embedding.length &&
            term1.embedding.every((v, i) => Math.abs(v - term2.embedding[i]) < 1e-6);
    }

    static fromJSON(json) {
        if (!json || !json.key) return null;
        return new Term(json.key, json.embedding, json.complexity);
    }

    static buildTermKey(pTerm) {
        if (!pTerm || !pTerm.type) return '';

        const build = Term.buildTermKey;
        const buildList = (terms) => terms.map(build).join(',');

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
                return `(${build(pTerm.subject)} --> ${build(pTerm.predicate)})`;
            case 'Implication':
                return `(${build(pTerm.subject)} ==> ${build(pTerm.predicate)})`;
            case 'Equivalence':
                return `(${build(pTerm.subject)} <=> ${build(pTerm.predicate)})`;
            case 'Similarity':
                return `(${build(pTerm.subject)} <-> ${build(pTerm.predicate)})`;
            case 'Instance':
                return `(${build(pTerm.subject)} {-- ${build(pTerm.predicate)})`;
            case 'Property':
                return `(${build(pTerm.subject)} --} ${build(pTerm.predicate)})`;
            case 'PredictiveImplication':
                return `(${build(pTerm.subject)} =\> ${build(pTerm.predicate)})`;
            case 'RetrospectiveImplication':
                return `(${build(pTerm.subject)} =/> ${build(pTerm.predicate)})`;
            case 'ConcurrentImplication':
                return `(${build(pTerm.subject)} =<> ${build(pTerm.predicate)})`;
            case 'Until':
                return `(${build(pTerm.subject)} until ${build(pTerm.predicate)})`;
            case 'Since':
                return `(${build(pTerm.subject)} since ${build(pTerm.predicate)})`;

            // Unary operators
            case 'Negation':
                return `(--,${build(pTerm.term)})`;
            case 'Always':
                return `(always,${build(pTerm.term)})`;
            case 'Eventually':
                return `(eventually,${build(pTerm.term)})`;
            case 'Next':
                return `(next,${build(pTerm.term)})`;
            case 'Previous':
                return `(previous,${build(pTerm.term)})`;

            // N-ary operators
            case 'Conjunction':
                return `(&,${buildList(pTerm.terms || [])})`;
            case 'Disjunction':
                return `(||,${buildList(pTerm.terms || [])})`;
            case 'SequentialConjunction':
                return `(&&,${buildList(pTerm.terms || [])})`;
            case 'ParallelConjunction':
                return `(&|,${buildList(pTerm.terms || [])})`;
            case 'ExtensionalDifference':
                return `(#,${buildList(pTerm.terms || [])})`;
            case 'IntensionalDifference':
                return `(\\,${buildList(pTerm.terms || [])})`;
            case 'Product':
                return `(*,${buildList(pTerm.terms || [])})`;

            // Sets
            case 'ExtensionalSet':
                return `{${buildList(pTerm.terms || [])}}`;
            case 'IntensionalSet':
                return `[${buildList(pTerm.terms || [])}]`;

            default:
                throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
        }
    }

    _getStructure() {
        if (this._structure === null) {
            try {
                this._structure = parseTerm(this.key);
            } catch (error) {
                this._structure = null;
            }
        }
        return this._structure;
    }

    _getComponent(componentName, structure) {
        if (this._componentCache.has(componentName)) {
            return this._componentCache.get(componentName);
        }

        const termStructure = structure || (this._getStructure() ? this._getStructure()[componentName] : null);
        if (!termStructure) {
            this._componentCache.set(componentName, null);
            return null;
        }

        try {
            const componentKey = Term.buildTermKey(termStructure);
            if (componentKey) {
                const componentTerm = new Term(componentKey);
                this._componentCache.set(componentName, componentTerm);
                return componentTerm;
            } else {
                this._componentCache.set(componentName, null);
                return null;
            }
        } catch (error) {
            this._componentCache.set(componentName, null);
            return null;
        }
    }

    equals(other) {
        return other instanceof Term && this.key === other.key;
    }

    toString() {
        return this.key;
    }

    hashCode() {
        let hash = 0;
        for (let i = 0; i < this.key.length; i++) {
            const char = this.key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    toJSON() {
        return {
            key: this.key,
            embedding: this.embedding,
            complexity: this.complexity,
        };
    }
}

export default Term;
