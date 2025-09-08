const ForgettingStrategy = require('./ForgettingStrategy');

class TimeBasedForgettingStrategy extends ForgettingStrategy {
    constructor(options = {}) {
        super(options);
        this.expirationThreshold = this.options.expirationThreshold || (BigInt(24) * BigInt(3600 * 1000)); // Default: 24 hours
    }

    prune(tasks) {
        const now = BigInt(Date.now());
        const updatedTasks = new Map();

        for (const [id, task] of tasks.entries()) {
            const lastAccessed = task.state.stamp.lastAccessed || task.state.stamp.creationTime;
            if (now - lastAccessed < this.expirationThreshold) {
                updatedTasks.set(id, task);
            }
        }
        return updatedTasks;
    }
}

module.exports = TimeBasedForgettingStrategy;
