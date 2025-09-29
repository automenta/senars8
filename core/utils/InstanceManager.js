/**
 * @fileoverview Optimized InstanceManager with LRU caching and memory management
 */

class InstanceManager {
    #cache;
    #maxSize;
    #evictionThreshold;
    #stats;

    /**
     * Creates an optimized instance manager with LRU caching
     * @param {number} maxSize - Maximum number of instances to cache (default: 10000)
     * @param {number} evictionThreshold - Percentage of cache to evict when max size reached (default: 0.2 for 20%)
     */
    constructor(maxSize = 10000, evictionThreshold = 0.2) {
        this.#maxSize = maxSize;
        this.#evictionThreshold = evictionThreshold;
        this.#cache = new Map();
        this.#stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            currentSize: 0
        };
    }

    /**
     * Returns the number of items in the cache.
     * @returns {number}
     */
    get size() {
        return this.#cache.size;
    }

    /**
     * Returns cache statistics
     * @returns {object} Stats object with hits, misses, evictions, currentSize
     */
    get stats() {
        return { ...this.#stats };
    }

    /**
     * Resets cache statistics
     */
    resetStats() {
        this.#stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            currentSize: this.#cache.size
        };
    }

    /**
     * Retrieves an instance from the cache.
     * @param {string} key - The unique key for the instance.
     * @returns {any|undefined} The cached instance or undefined if not found.
     */
    get(key) {
        if (this.#cache.has(key)) {
            this.#stats.hits++;
            // Move to end to mark as most recently used (LRU)
            const value = this.#cache.get(key);
            this.#cache.delete(key);
            this.#cache.set(key, value);
            return value;
        }
        
        this.#stats.misses++;
        return undefined;
    }

    /**
     * Adds an instance to the cache.
     * @param {string} key - The unique key for the instance.
     * @param {any} instance - The instance to cache.
     */
    add(key, instance) {
        // Check if we need to evict old items
        if (this.#cache.size >= this.#maxSize) {
            this._evictOldest();
        }

        // Add the new item
        this.#cache.set(key, instance);
        this.#stats.currentSize = this.#cache.size;
    }

    /**
     * Checks if an instance is in the cache.
     * @param {string} key - The unique key for the instance.
     * @returns {boolean} True if the instance is cached, false otherwise.
     */
    has(key) {
        return this.#cache.has(key);
    }

    /**
     * Clears the entire instance cache.
     */
    clear() {
        this.#cache.clear();
        this.#stats.currentSize = 0;
    }

    /**
     * Evicts oldest items when cache exceeds max size
     * @private
     */
    _evictOldest() {
        const evictionCount = Math.ceil(this.#maxSize * this.#evictionThreshold);
        
        let count = 0;
        // For Map, the first entries are the oldest (since we move accessed items to the end)
        for (const [key] of this.#cache) {
            if (count >= evictionCount) break;
            this.#cache.delete(key);
            count++;
            this.#stats.evictions++;
        }
        
        this.#stats.currentSize = this.#cache.size;
    }

    /**
     * Returns cache hit ratio
     * @returns {number} Ratio of hits to total requests
     */
    get hitRatio() {
        const total = this.#stats.hits + this.#stats.misses;
        return total > 0 ? this.#stats.hits / total : 0;
    }

    /**
     * Get cache capacity utilization
     * @returns {number} Ratio of current size to max size
     */
    get utilization() {
        return this.#cache.size / this.#maxSize;
    }
}

// Export a singleton instance to be used across the application.
export default new InstanceManager();