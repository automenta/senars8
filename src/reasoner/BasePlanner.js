const CostManager = require('./CostManager');

class BasePlanner {
    constructor(memory, config = {}) {
        this.memory = memory;
        this.costManager = new CostManager(memory, config);
        this.config = {
            confidenceThreshold: config.confidenceThreshold || 0.9,
            preconditionConfidenceThreshold: config.preconditionConfidenceThreshold || 0.8,
        };
    }
}

module.exports = BasePlanner;
