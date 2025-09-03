class Term {
    /**
     * Builds a term key string from a structured representation.
     * This is the reverse of parsing.
     * @param {object} parsedTerm - The structured representation of the term.
     * @returns {string} The canonical term key string.
     */
    static build(parsedTerm) {
        if (!parsedTerm || !parsedTerm.type) {
            return '';
        }

        switch (parsedTerm.type) {
            case 'Atomic':
                return parsedTerm.key;
            case 'Inheritance':
                return `(${Term.build(parsedTerm.subject)} --> ${Term.build(parsedTerm.predicate)})`;
            default:
                throw new Error(`Term.build does not support type: ${parsedTerm.type}`);
        }
    }

    constructor(key, embedding = [], complexity = 1) {
        if (typeof key !== 'string' || key.length === 0) {
            throw new Error('Term key must be a non-empty string.');
        }
        if (!Array.isArray(embedding)) {
            throw new Error('Term embedding must be an array.');
        }
        if (typeof complexity !== 'number' || complexity <= 0) {
            throw new Error('Term complexity must be a positive number.');
        }

        this.key = key;
        this.embedding = Object.freeze([...embedding]);
        this.complexity = complexity;

        Object.freeze(this);
    }
}

module.exports = Term;
