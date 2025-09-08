const Bag = require('../../utils/Bag');

/**
 * A strategy that uses a Bag data structure to sample premises based on priority.
 * This is much more efficient than the brute-force approach for large focus sets.
 */
class BagSamplingStrategy {
    constructor(samplingFactor = 2) {
        this.samplingFactor = samplingFactor;
        // Cache for storing previously created bags to avoid recreation
        this._bagCache = new Map();
    }

    /**
     * A generator that yields combinations of tasks sampled from a Bag.
     * @param {Task[]} focusSet - The list of tasks to select from.
     * @param {number} arity - The size of the combinations to generate.
     * @yields {Task[]} An array containing a combination of tasks.
     */
    * selectCombinations(focusSet, arity) {
        if (!Array.isArray(focusSet) || focusSet.length < arity) return;

        // Create a cache key based on focus set IDs and arity
        const focusSetIds = focusSet.map(task => task.id).sort().join(',');
        const cacheKey = `${focusSetIds}:${arity}`;
        
        let bag;
        // Try to use cached bag if available
        if (this._bagCache.has(cacheKey)) {
            bag = this._bagCache.get(cacheKey);
        } else {
            // Create new bag
            bag = new Bag(focusSet.length);
            for (const task of focusSet) {
                bag.put(task, task.state.priority);
            }
            bag.commit();
            
            // Cache the bag for future use (with size limit to prevent memory issues)
            if (this._bagCache.size < 100) { // Limit cache size
                this._bagCache.set(cacheKey, bag);
            }
        }

        if (bag.size() < arity) return;

        const numSamples = Math.ceil(focusSet.length * this.samplingFactor);

        for (let i = 0; i < numSamples; i++) {
            const combination = [];
            const ids = new Set();

            // Try to get a unique set of tasks of size 'arity'
            let attempts = 0;
            while (combination.length < arity && attempts < arity * 2) {
                const task = bag.sample();
                if (task && !ids.has(task.id)) {
                    combination.push(task);
                    ids.add(task.id);
                }
                attempts++;
            }

            if (combination.length === arity) {
                yield combination;
            }
        }
    }
    
    /**
     * Clear the bag cache to free memory
     */
    clearCache() {
        this._bagCache.clear();
    }
}

module.exports = BagSamplingStrategy;
