class BasePhase {
    constructor(name) {
        if (this.constructor === BasePhase) {
            throw new Error("Abstract class 'BasePhase' cannot be instantiated directly.");
        }
        this.name = name;
    }

    execute(cycle, context) {
        throw new Error("Method 'execute()' must be implemented.");
    }
}

module.exports = BasePhase;
