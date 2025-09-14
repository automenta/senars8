import ForgettingStrategy from './ForgettingStrategy.js';

class TimeBasedForgettingStrategy extends ForgettingStrategy {
    constructor(options = {}) {
        super(options);
        this.defaultOptions = {
            expirationThreshold: 24 * 3600 * 1000, // 24 hours in milliseconds
            importanceThresholds: {
                priority: 0.5,
                confidence: 0.5,
            }
        };
    }

    prune(tasks, options = {}) {
        const now = Date.now();
        const updatedTasks = new Map();

        const {
            expirationThreshold,
            importanceThresholds
        } = {...this.defaultOptions, ...options};

        for (const [id, task] of tasks.entries()) {
            const lastAccessed = task.state.stamp.lastAccessed || task.state.stamp.creationTime;
            
            // Handle both BigInt and number timestamps
            const lastAccessedTime = typeof lastAccessed === 'bigint' ? Number(lastAccessed) : lastAccessed;
            const isExpired = (now - lastAccessedTime) >= expirationThreshold;

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

export default TimeBasedForgettingStrategy;
