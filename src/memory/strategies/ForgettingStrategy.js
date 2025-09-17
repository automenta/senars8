class ForgettingStrategy {
    constructor(options = {}) {
        this.options = options;
    }

    prune(_tasks) {
        throw new Error('ForgettingStrategy subclasses must implement a prune() method.');
    }
}

export default ForgettingStrategy;
