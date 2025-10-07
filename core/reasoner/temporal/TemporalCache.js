import {debug, info} from '../../utils/logger.js';
import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('TemporalCache');

class TemporalCache {
    /**
     * Creates a TemporalCache instance
     * @param {number} maxEntries - Maximum number of entries to cache (default: 1000)
     * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
     */
    constructor(maxEntries = 1000, ttl = 5 * 60 * 1000) {
        this.cache = new Map();
        this.accessTimes = new Map(); // Track access times
        this.hitCount = 0;
        this.missCount = 0;
        this.maxEntries = maxEntries;
        this.ttl = ttl;
        this.metricsService = null;
        
        info(`TemporalCache initialized with maxEntries: ${maxEntries}, TTL: ${ttl}ms`);
    }

    /**
     * Sets the metrics service for tracking cache effectiveness
     * @param {MetricsService} metricsService - Metrics service instance
     */
    setMetricsService(metricsService) {
        this.metricsService = metricsService;
    }

    /**
     * Generates a unique key for caching based on tasks and module
     * @param {string} moduleName - Name of the temporal module
     * @param {Task[]} tasks - Array of tasks to create key from
     * @param {Object} options - Additional options for the key
     * @returns {string} Cache key
     */
    _generateKey(moduleName, tasks, options = {}) {
        // Create a stable key based on task term keys and timestamps, not IDs (which are unique)
        // This ensures identical tasks produce the same key
        const taskKeys = tasks.map(task => 
            `${task.termKey}_${task.state.stamp?.occurrenceTime || 'no_time'}`
        ).sort().join('|');
        
        const optionsKey = JSON.stringify(options);
        return `${moduleName}|${taskKeys}|${optionsKey}`;
    }

    /**
     * Checks if an entry exists and is still valid (not expired)
     * @param {string} key - Cache key to check
     * @returns {boolean} True if entry exists and is valid
     */
    _isValid(key) {
        if (!this.cache.has(key)) return false;
        
        const accessTime = this.accessTimes.get(key);
        const now = Date.now();
        
        // Check if entry has expired
        if (now - accessTime > this.ttl) {
            this._remove(key);
            return false;
        }
        
        return true;
    }

    /**
     * Removes an entry from cache
     * @param {string} key - Cache key to remove
     * @private
     */
    _remove(key) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
    }

    /**
     * Removes oldest entries if cache is at max capacity
     * @private
     */
    _evictIfNecessary() {
        if (this.cache.size >= this.maxEntries) {
            // Sort entries by access time (oldest first)
            const sortedEntries = Array.from(this.accessTimes.entries())
                .sort((a, b) => a[1] - b[1]);
            
            // Remove oldest entries (20% of maxEntries)
            const toRemove = Math.max(1, Math.floor(this.maxEntries * 0.2));
            for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
                this._remove(sortedEntries[i][0]);
            }
        }
    }

    /**
     * Gets cached value for the given module and tasks
     * @param {string} moduleName - Name of the temporal module
     * @param {Task[]} tasks - Array of tasks
     * @param {Object} options - Additional options
     * @returns {*} Cached value or null if not found/expired
     */
    get(moduleName, tasks, options = {}) {
        const key = this._generateKey(moduleName, tasks, options);
        
        if (this._isValid(key)) {
            this.accessTimes.set(key, Date.now()); // Update access time
            this.hitCount++;
            
            // Track cache hit in metrics if available
            if (this.metricsService) {
                this.metricsService.trackTemporalCaching(true);
            }
            
            debug(`Cache HIT for: ${moduleName} with ${tasks.length} tasks`);
            return this.cache.get(key);
        }
        
        this.missCount++;
        
        // Track cache miss in metrics if available
        if (this.metricsService) {
            this.metricsService.trackTemporalCaching(false);
        }
        
        debug(`Cache MISS for: ${moduleName} with ${tasks.length} tasks`);
        return null;
    }

    /**
     * Sets a value in cache for the given module and tasks
     * @param {string} moduleName - Name of the temporal module
     * @param {Task[]} tasks - Array of tasks
     * @param {*} value - Value to cache
     * @param {Object} options - Additional options
     * @returns {boolean} True if successfully cached
     */
    set(moduleName, tasks, value, options = {}) {
        const key = this._generateKey(moduleName, tasks, options);
        
        // Evict if necessary before adding new entry
        this._evictIfNecessary();
        
        // Set the value and access time
        this.cache.set(key, value);
        this.accessTimes.set(key, Date.now());
        
        return true;
    }

    /**
     * Clears the cache
     */
    clear() {
        this.cache.clear();
        this.accessTimes.clear();
        this.hitCount = 0;
        this.missCount = 0;
        
        info('TemporalCache cleared');
    }

    /**
     * Gets cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const totalRequests = this.hitCount + this.missCount;
        const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
        
        return {
            size: this.cache.size,
            hitCount: this.hitCount,
            missCount: this.missCount,
            totalRequests,
            hitRate,
            effectiveness: hitRate,
            maxEntries: this.maxEntries,
            ttl: this.ttl
        };
    }

    /**
     * Cleans up expired entries
     */
    cleanup() {
        for (const [key, accessTime] of this.accessTimes) {
            if (Date.now() - accessTime > this.ttl) {
                this._remove(key);
            }
        }
    }

    /**
     * Preloads cache with predicted temporal patterns based on historical data
     * @param {string} moduleName - Name of the temporal module
     * @param {Task[]} tasks - Array of tasks that are likely to be processed
     * @param {*} predictedValue - Predicted temporal result
     * @param {Object} options - Additional options
     */
    preload(moduleName, tasks, predictedValue, options = {}) {
        const key = this._generateKey(moduleName, tasks, options);
        
        // Don't overwrite existing valid entries
        if (this._isValid(key)) {
            return false;
        }
        
        // Evict if necessary before adding new entry
        this._evictIfNecessary();
        
        this.cache.set(key, predictedValue);
        this.accessTimes.set(key, Date.now());
        
        debug(`Cache preloaded for: ${moduleName} with ${tasks.length} tasks`);
        return true;
    }
}

export default TemporalCache;