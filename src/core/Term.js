class Term {
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
