class Term {
    constructor(key, embedding = [], complexity = 1) {
        if (typeof key !== 'string' || !key.length || !Array.isArray(embedding) || typeof complexity !== 'number' || complexity <= 0) {
            throw new Error('Invalid arguments for Term constructor');
        }

        this.key = key;
        this.embedding = Object.freeze([...embedding]);
        this.complexity = complexity;

        Object.freeze(this);
    }
}

module.exports = Term;
