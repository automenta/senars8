const { parseTerm } = require('../parser/narseseParser');
const { buildTermKey } = require('../utils/term-utils');

class Term {
    constructor(key, embedding = [], complexity = 1) {
        if (typeof key !== 'string' || !key.length) {
            throw new Error('Invalid key for Term constructor');
        }

        this.key = key;
        this.embedding = Object.freeze([...embedding]);
        this.complexity = complexity;

        this._structure = parseTerm(key);
        this._componentCache = {}; // Cache for Term components
    }

    get type() {
        return this._structure ? this._structure.type : 'Atomic';
    }

    get subject() {
        return this._getComponent('subject');
    }

    get predicate() {
        return this._getComponent('predicate');
    }

    get terms() {
        if (!this._structure || !this._structure.terms) return null;
        if (!this._componentCache.terms) {
            this._componentCache.terms = this._structure.terms.map((t, i) => this._getComponent(`term_${i}`, t));
        }
        return this._componentCache.terms;
    }

    _getComponent(name, structure) {
        const struct = structure || (this._structure ? this._structure[name] : null);
        if (!struct) return null;

        if (!this._componentCache[name]) {
            const componentKey = buildTermKey(struct);
            if (componentKey) {
                this._componentCache[name] = new Term(componentKey);
            } else {
                return null;
            }
        }
        return this._componentCache[name];
    }

    equals(other) {
        return other instanceof Term && this.key === other.key;
    }
}

module.exports = Term;
