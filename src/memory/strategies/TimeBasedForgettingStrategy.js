import ForgettingStrategy from './ForgettingStrategy.js';

class TimeBasedForgettingStrategy extends ForgettingStrategy {
    constructor(options = {}) {
        super(options);
        this.defaultOptions = {
            expirationThreshold: 24 * 3600 * 1000, // 24 hours in milliseconds
            importanceThresholds: {
                priority: 0.5,
                confidence: 0.5
            }
        };
    }

    prune(tasks, options = {}) {
        const now = Date.now();
        const {
            expirationThreshold,
            importanceThresholds
        } = { ...this.defaultOptions,
            ...options
        };

        const numericExpirationThreshold = typeof expirationThreshold === 'bigint' ? Number(expirationThreshold) : expirationThreshold;

        return new Map(
            [...tasks.entries()].filter(([, task]) => {
                const lastAccessed = task.state.stamp.lastAccessed || task.state.stamp.creationTime;
                const lastAccessedTime = typeof lastAccessed === 'bigint' ? Number(lastAccessed) : lastAccessed;
                const isExpired = (now - lastAccessedTime) >= numericExpirationThreshold;

                if (!isExpired) return true;

                return task.state.priority >= importanceThresholds.priority ||
                    task.state.truthValue.confidence >= importanceThresholds.confidence;
            })
        );
    }
}

export default TimeBasedForgettingStrategy;
