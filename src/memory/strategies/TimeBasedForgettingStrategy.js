const ForgettingStrategy = require('./ForgettingStrategy');

class TimeBasedForgettingStrategy extends ForgettingStrategy {
    constructor(options = {}) {
        super(options);
        this.defaultOptions = {
            expirationThreshold: BigInt(24) * BigInt(3600 * 1000),
            importanceThresholds: {
                priority: 0.5,
                confidence: 0.5,
            }
        };
    }

    prune(tasks, options = {}) {
        const now = BigInt(Date.now());
        const updatedTasks = new Map();

        const {
            expirationThreshold,
            importanceThresholds
        } = {...this.defaultOptions, ...options};

        for (const [id, task] of tasks.entries()) {
            const lastAccessed = task.state.stamp.lastAccessed || task.state.stamp.creationTime;
            const isExpired = (now - lastAccessed) >= expirationThreshold;

            if (!isExpired) {
                updatedTasks.set(id, task);
                continue;
            }

            const isImportant = task.state.priority >= importanceThresholds.priority ||
                task.state.truthValue.confidence >= importanceThresholds.confidence;

            if (isImportant) {
                updatedTasks.set(id, task);
            }
        }
        return updatedTasks;
    }
}

module.exports = TimeBasedForgettingStrategy;
