/**
 * Base Registry class providing a foundation for different registry implementations
 * following the DRY principle and promoting modularity
 */
export class BaseRegistry {
    /**
     * Creates a new BaseRegistry instance
     * @param {string} name - Name of the registry for logging/information purposes
     * @param {Map} [sharedCache] - Optional shared cache to be used across registries
     */
    constructor(name, sharedCache = null) {
        this.name = name;
        this.storage = new Map();
        this.cache = sharedCache || new Map();
        this.metrics = {
            operations: 0,
            cacheHits: 0
        };
    }

    /**
     * Registers a value with a key
     * @param {string} key - Key to register the value under
     * @param {*} value - Value to register
     */
    register(key, value) {
        this.storage.set(key, value);
    }

    /**
     * Gets a value by key with optional argument processing
     * @param {string} key - Key to retrieve
     * @param {...*} args - Arguments to pass to the stored function
     * @returns {*} Retrieved value
     */
    get(key, ...args) {
        this.metrics.operations++;
        
        // Create cache key considering BigInt and circular references
        const safeStringify = (obj) => JSON.stringify(obj, (k, v) => 
            typeof v === 'bigint' ? v.toString() : v
        );
        const cacheKey = `${key}:${safeStringify(args)}`;

        const cached = this.cache.get(cacheKey);
        if (cached) {
            this.metrics.cacheHits++;
            return cached;
        }

        const item = this.storage.get(key);
        if (!item) {
            throw new Error(`Unknown ${this.name}: ${key}`);
        }

        const result = typeof item === 'function' ? item(...args) : item;
        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Gets hit rate for caching
     * @returns {number} Hit rate ratio
     */
    get hitRate() {
        return this.metrics.operations > 0 ? 
            this.metrics.cacheHits / this.metrics.operations : 0;
    }

    /**
     * Resets metrics for this registry
     */
    reset() {
        this.metrics = {
            operations: 0,
            cacheHits: 0
        };
    }

    /**
     * Gets metrics for this registry
     * @returns {object} Metrics object
     */
    getMetrics() {
        return {
            ...this.metrics,
            hitRate: this.hitRate,
            cacheSize: this.cache.size
        };
    }
}

/**
 * Optimized LRU cache with performance metrics
 */
export class OptimizedCache {
    /**
     * Creates a new OptimizedCache instance
     * @param {number} maxSize - Maximum size of the cache
     */
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = []; // Tracks access order for LRU
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Gets an item from the cache
     * @param {string} key - Key to retrieve
     * @returns {*} Cached value or undefined
     */
    get(key) {
        if (this.cache.has(key)) {
            this.hits++;
            // Update access order (move to end for LRU)
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        this.misses++;
        return undefined;
    }

    /**
     * Sets a value in the cache with LRU eviction
     * @param {string} key - Key to store
     * @param {*} value - Value to store
     */
    set(key, value) {
        if (this.cache.has(key)) {
            // Update access order but don't evict
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used item
            const lruKey = this.accessOrder.shift();
            if (lruKey) {
                this.cache.delete(lruKey);
            }
        }

        this.cache.set(key, value);
        this.accessOrder.push(key);
    }

    /**
     * Clears the cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
        this.hits = this.misses = 0;
    }

    /**
     * Gets the current size of the cache
     * @returns {number} Current cache size
     */
    get size() {
        return this.cache.size;
    }

    /**
     * Gets the hit rate of the cache
     * @returns {number} Hit rate ratio
     */
    get hitRate() {
        return (this.hits + this.misses) > 0 ? 
            this.hits / (this.hits + this.misses) : 0;
    }

    /**
     * Gets stats about the cache
     * @returns {object} Cache statistics
     */
    getStats() {
        return {
            size: this.size,
            hitRate: this.hitRate,
            hits: this.hits,
            misses: this.misses
        };
    }
}

/**
 * Utility function for batch operations
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} batchSize - Size of each batch
 * @returns {Array} Processed results
 */
export const batchProcess = (items, processor, batchSize = 10) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = batch.map(processor);
        results.push(...batchResults);
    }
    return results;
};