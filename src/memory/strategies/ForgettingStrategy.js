class ForgettingStrategy {
    constructor(options = {}) {
        this.options = options;
    }

    prune(tasks) {
        throw new Error('ForgettingStrategy subclasses must implement a prune() method.');
    }
}

export default ForgettingStrategy;
