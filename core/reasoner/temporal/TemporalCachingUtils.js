import {createUnifiedErrorHandler} from '../../utils/errorHandler.js';
import {debug} from '../../utils/logger.js';

const errorHandler = createUnifiedErrorHandler('TemporalCachingUtils');

/**
 * Utility function to wrap a module's inference/detection method with caching functionality
 * @param {string} moduleName - Name of the module for cache key generation
 * @param {Function} method - The original method to wrap
 * @param {TemporalCache} cache - The temporal cache instance to use
 * @param {MetricsService} [metricsService] - Optional metrics service for tracking
 * @returns {Function} The wrapped method with caching
 */
function withTemporalCaching(moduleName, method, cache, metricsService = null) {
    return function(tasks, options = {}) {
        return errorHandler.executeSync(() => {
            // If cache is available, try to retrieve cached result first
            if (cache) {
                const cachedResult = cache.get(moduleName, tasks, options);
                if (cachedResult !== null) {
                    debug(`Cache HIT for ${moduleName} with ${tasks.length} tasks`);
                    return cachedResult;
                }
            }

            // Execute the original method
            const result = method.call(this, tasks, options);
            
            // Cache the result if cache is available
            if (cache) {
                cache.set(moduleName, tasks, result, options);
            }

            return result;
        }, `${moduleName}_withCache`, []);
    };
}

/**
 * Standardized cache key generation function
 * @param {string} moduleName - Name of the temporal module
 * @param {Task[]} tasks - Array of tasks
 * @param {Object} options - Additional options for the key
 * @returns {string} Cache key
 */
function generateCacheKey(moduleName, tasks, options = {}) {
    // Create a stable key based on task term keys and timestamps, not IDs (which are unique)
    const taskKeys = tasks.map(task => 
        `${task.termKey}_${task.state.stamp?.occurrenceTime || 'no_time'}`
    ).sort().join('|');
    
    const optionsKey = JSON.stringify(options);
    return `${moduleName}|${taskKeys}|${optionsKey}`;
}

/**
 * Standardized cache getter with proper logging and metrics
 * @param {TemporalCache} cache - The temporal cache instance
 * @param {string} moduleName - Name of the module
 * @param {Task[]} tasks - Array of tasks
 * @param {Object} options - Additional options
 * @param {MetricsService} [metricsService] - Optional metrics service
 * @returns {*} Cached value or null if not found/expired
 */
function getCachedValue(cache, moduleName, tasks, options = {}, metricsService = null) {
    if (!cache) return null;
    
    const key = generateCacheKey(moduleName, tasks, options);
    
    if (cache._isValid(key)) {
        cache.accessTimes.set(key, Date.now()); // Update access time
        cache.hitCount++;
        
        // Track cache hit in metrics if available
        if (metricsService) {
            metricsService.trackTemporalCaching(true);
        }
        
        debug(`Cache HIT for: ${moduleName} with ${tasks.length} tasks`);
        return cache.cache.get(key);
    }
    
    cache.missCount++;
    
    // Track cache miss in metrics if available
    if (metricsService) {
        metricsService.trackTemporalCaching(false);
    }
    
    debug(`Cache MISS for: ${moduleName} with ${tasks.length} tasks`);
    return null;
}

/**
 * Standardized cache setter with proper logging
 * @param {TemporalCache} cache - The temporal cache instance
 * @param {string} moduleName - Name of the module
 * @param {Task[]} tasks - Array of tasks
 * @param {*} value - Value to cache
 * @param {Object} options - Additional options
 * @returns {boolean} True if successfully cached
 */
function setCachedValue(cache, moduleName, tasks, value, options = {}) {
    if (!cache) return false;
    
    // Evict if necessary before adding new entry
    cache._evictIfNecessary();
    
    const key = generateCacheKey(moduleName, tasks, options);
    
    // Set the value and access time
    cache.cache.set(key, value);
    cache.accessTimes.set(key, Date.now());
    
    return true;
}

/**
 * Utility to create a module with standardized caching behavior
 * @param {string} moduleName - Name of the module
 * @param {object} methods - Object containing the module's methods
 * @param {TemporalCache} cache - The temporal cache instance to use
 * @param {MetricsService} [metricsService] - Optional metrics service
 * @returns {object} The module with caching applied to appropriate methods
 */
function createCachingTemporalModule(moduleName, methods, cache, metricsService = null) {
    const module = {
        cache: null,
        metricsService: null,
        
        setCache(c) {
            module.cache = c;
        },
        
        setMetricsService(ms) {
            module.metricsService = ms;
        }
    };
    
    // Apply caching to methods that follow the standard pattern
    for (const [methodName, method] of Object.entries(methods)) {
        if (typeof method === 'function') {
            module[methodName] = function(tasks, options = {}) {
                return withTemporalCaching(
                    moduleName, 
                    method.bind(methods), 
                    cache, 
                    metricsService
                ).call(this, tasks, options);
            };
        } else {
            module[methodName] = method;
        }
    }
    
    return module;
}

export {
    withTemporalCaching,
    generateCacheKey,
    getCachedValue,
    setCachedValue,
    createCachingTemporalModule
};