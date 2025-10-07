/**
 * High-quality TemporalReasoner for temporal inference and pattern recognition
 * This refactored version improves maintainability, performance, and extensibility
 */

import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {debug, info} from '../utils/logger.js';
import * as TemporalModules from './temporal/index.js';
import createConfigAccessor from '../config/ConfigAccessor.js';
import {calculateTemporalModuleEffectiveness} from '../utils/effectiveness-utils.js';
import TemporalCache from './temporal/TemporalCache.js';
import LMTemporalPatternPredictor from './temporal/LMTemporalPatternPredictor.js';

const errorHandler = createUnifiedErrorHandler('TemporalReasoner');

class TemporalReasoner {
    /**
     * Creates a TemporalReasoner instance
     * @param {ConfigManager} configManager - System configuration manager
     * @param {MetricsService} metricsService - Metrics service instance
     * @param {LM} lm - Language model instance for predictions
     */
    constructor(configManager, metricsService = null, lm = null) {
        this.config = createConfigAccessor(configManager, 'temporal');

        // Initialize caching mechanism
        this.cache = new TemporalCache(
            this.config.get('temporal.CACHE_MAX_ENTRIES', 1000),
            this.config.get('temporal.CACHE_TTL_MS', 5 * 60 * 1000) // 5 minutes default
        );

        // Initialize LM-powered predictor
        this.lmPredictor = new LMTemporalPatternPredictor(lm);

        // Initialize all temporal inference modules
        this.inferenceModules = [
            TemporalModules.TemporalRelationshipInference,
            TemporalModules.TemporalImplicationInference,
            TemporalModules.TemporalPatternDetection,
            TemporalModules.TemporalCycleDetection,
            TemporalModules.TemporalAbstraction,
            TemporalModules.TemporalAnomalyDetection,
            TemporalModules.FutureTaskPrediction,
            TemporalModules.TemporalClusterDetection,
            TemporalModules.TemporalSummaryGeneration
        ];

        // Set cache for all modules that support it
        this._setupCaching();

        // Set metrics service for all modules that support it
        this._setupMetrics(metricsService);

        // Set LM predictor cache
        this.lmPredictor.setCache(this.cache);

        // Performance tracking
        this.performanceStats = new Map();

        // Caching metrics
        this.cachingStats = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };

        this.metricsService = metricsService;

        info(`TemporalReasoner initialized with ${this.inferenceModules.length} inference modules and caching`);
    }

    /**
     * Sets up caching for modules that support it
     * @private
     */
    _setupCaching() {
        for (const module of this.inferenceModules) {
            if (module.setCache) {
                module.setCache(this.cache);
            }
        }
    }

    /**
     * Sets up metrics service for modules that support it
     * @private
     * @param {MetricsService} metricsService
     */
    _setupMetrics(metricsService) {
        if (metricsService) {
            // Set metrics service in cache
            this.cache.setMetricsService(metricsService);

            // Set metrics service for modules that support it
            for (const module of this.inferenceModules) {
                if (module.setMetricsService) {
                    module.setMetricsService(metricsService);
                }
            }
        }
    }

    /**
     * Performs temporal inference on a set of tasks
     * @param {Task[]} tasks - Array of tasks to perform temporal reasoning on
     * @param {object} [options] - Options for temporal inference
     * @param {boolean} [options.enableAllModules=true] - Whether to run all modules
     * @param {string[]} [options.enabledModules] - Specific modules to enable (if provided, overrides enableAllModules)
     * @param {boolean} [options.useLMEnhancement=true] - Whether to use LM-powered temporal pattern prediction
     * @returns {Task[]} Array of temporally-derived tasks
     */
    async infer(tasks, options = {}) {
        const config = this.config.get('temporal');

        if (!config) {
            debug('Temporal reasoning disabled - no temporal config found');
            return [];
        }

        const {
            enableAllModules = true,
            enabledModules = null,
            useLMEnhancement = true
        } = options;

        let modulesToRun = this.inferenceModules;

        // If specific modules are enabled, only run those
        if (Array.isArray(enabledModules) && enabledModules.length > 0) {
            modulesToRun = this.inferenceModules.filter(module =>
                enabledModules.includes(module.name || this._getModuleName(module))
            );
        } else if (!enableAllModules) {
            // If not enabling all and no specific modules, return empty array
            return [];
        }

        // Use LM enhancement to predict likely patterns and preload cache
        if (useLMEnhancement && this.lmPredictor) {
            this.lmPredictor.predictTemporalPatterns(tasks);
        }

        // Run all selected inference modules
        const allInferredTasks = modulesToRun.flatMap(InferenceModule => {
            const moduleName = this._getModuleName(InferenceModule);
            const result = errorHandler.executeSync(() => {
                // Track performance for this module
                const startTime = Date.now();
                // Pass options to the infer method so modules can use them for caching
                const result = InferenceModule.infer(tasks, options);
                const endTime = Date.now();

                // Update performance statistics
                this._updatePerformanceStats(moduleName, endTime - startTime, Array.isArray(result) ? result.length : 0);

                // Update metrics service with temporal performance stats
                if (this.metricsService) {
                    this.metricsService.updateTemporalPerformanceStats(this.getPerformanceStats());
                }

                return Array.isArray(result) ? result : [];
            }, `infer:${moduleName}`, []);

            if (result.length > 0) {
                debug(`Temporal module "${moduleName}" generated ${result.length} tasks`);
            }

            return result;
        });

        debug(`Temporal reasoning completed with ${allInferredTasks.length} derived tasks from ${modulesToRun.length} active modules`);

        return allInferredTasks;
    }

    /**
     * Performs selective temporal inference on specific modules
     * @param {Task[]} tasks - Array of tasks to perform temporal reasoning on
     * @param {string[]} moduleNames - Names of modules to run
     * @param {object} [options] - Options for temporal inference
     * @returns {Task[]} Array of temporally-derived tasks
     */
    selectiveInfer(tasks, moduleNames, options = {}) {
        if (!Array.isArray(moduleNames)) {
            throw new Error('moduleNames must be an array of module names');
        }

        const config = this.config.get('temporal');

        if (!config) {
            debug('Temporal reasoning disabled - no temporal config found');
            return [];
        }

        const results = [];

        for (const moduleName of moduleNames) {
            const module = this._findModuleByName(moduleName);

            if (!module) {
                debug(`Temporal module "${moduleName}" not found, skipping`);
                continue;
            }

            const result = errorHandler.executeSync(() => {
                const startTime = Date.now();
                // Pass options to the infer method so modules can use them for caching
                const result = module.infer(tasks, options);
                const endTime = Date.now();

                this._updatePerformanceStats(moduleName, endTime - startTime, Array.isArray(result) ? result.length : 0);

                // Update metrics service with temporal performance stats
                if (this.metricsService) {
                    this.metricsService.updateTemporalPerformanceStats(this.getPerformanceStats());
                }

                return Array.isArray(result) ? result : [];
            }, `selectiveInfer:${moduleName}`, []);

            results.push(...result);
        }

        return results;
    }

    /**
     * Detects temporal patterns in the given tasks
     * @param {Task[]} tasks - Array of tasks to analyze
     * @param {object} [options] - Options for pattern detection
     * @returns {object[]} Array of detected temporal patterns
     */
    detectTemporalPatterns(tasks, options = {}) {
        const config = this.config.get('temporal');

        if (!config) {
            return [];
        }

        return errorHandler.executeSync(() => {
            return TemporalModules.TemporalPatternDetection?.detect?.(tasks, options) || [];
        }, 'detectTemporalPatterns', []);
    }

    /**
     * Predicts future tasks based on temporal patterns
     * @param {Task[]} tasks - Array of tasks to base predictions on
     * @param {object} [options] - Options for future task prediction
     * @returns {Task[]} Array of predicted future tasks
     */
    predictFutureTasks(tasks, options = {}) {
        const config = this.config.get('temporal');

        if (!config) {
            return [];
        }

        return errorHandler.executeSync(() => {
            return TemporalModules.FutureTaskPrediction?.predict?.(tasks, options) || [];
        }, 'predictFutureTasks', []);
    }

    /**
     * Gets performance statistics for temporal reasoning modules
     * @returns {object} Performance statistics
     */
    getPerformanceStats() {
        const stats = {};
        for (const [moduleName, moduleStats] of this.performanceStats) {
            // Calculate standardized effectiveness for each module
            const moduleEffectiveness = calculateTemporalModuleEffectiveness(moduleStats);
            stats[moduleName] = {
                ...moduleStats,
                ...moduleEffectiveness
            };
        }

        return {
            modules: stats,
            totalCalls: Array.from(this.performanceStats.values()).reduce((sum, stat) => sum + stat.callCount, 0),
            totalTasksGenerated: Array.from(this.performanceStats.values()).reduce((sum, stat) => sum + stat.totalTasksGenerated, 0)
        };
    }

    /**
     * Updates performance statistics for a module
     * @private
     * @param {string} moduleName - Name of the module
     * @param {number} executionTime - Execution time in milliseconds
     * @param {number} tasksGenerated - Number of tasks generated
     */
    _updatePerformanceStats(moduleName, executionTime, tasksGenerated) {
        if (!this.performanceStats.has(moduleName)) {
            this.performanceStats.set(moduleName, {
                callCount: 0,
                totalExecutionTime: 0,
                totalTasksGenerated: 0,
                averageExecutionTime: 0
            });
        }

        const stats = this.performanceStats.get(moduleName);
        stats.callCount++;
        stats.totalExecutionTime += executionTime;
        stats.totalTasksGenerated += tasksGenerated;
    }

    /**
     * Gets the name of a module
     * @private
     * @param {object} module - The module
     * @returns {string} The module name
     */
    _getModuleName(module) {
        return module.name || module.constructor?.name || 'UnknownModule';
    }

    /**
     * Finds a module by name
     * @private
     * @param {string} name - Name of the module to find
     * @returns {object|null} The found module or null if not found
     */
    _findModuleByName(name) {
        return this.inferenceModules.find(module =>
            this._getModuleName(module) === name
        );
    }

    /**
     * Gets information about available temporal inference modules
     * @returns {object[]} Array of module information
     */
    getModuleInfo() {
        return this.inferenceModules.map(module => ({
            name: this._getModuleName(module),
            description: module.description || 'No description available',
            hasInferMethod: typeof module.infer === 'function',
            hasAdditionalMethods: Object.keys(module).filter(key =>
                key !== 'name' && key !== 'infer' && typeof module[key] === 'function'
            )
        }));
    }

    /**
     * Track temporal caching effectiveness
     * @param {boolean} hit - Whether the cache was hit
     */
    trackCaching(hit) {
        if (hit) {
            this.cachingStats.hits++;
        } else {
            this.cachingStats.misses++;
        }
        this.cachingStats.totalRequests++;

        // Also update metrics service with caching effectiveness
        if (this.metricsService) {
            this.metricsService.trackTemporalCaching(hit);
        }
    }

    /**
     * Get temporal caching statistics
     * @returns {object} Caching statistics
     */
    getCachingStats() {
        const effectiveness = this.cachingStats.totalRequests > 0 ?
            this.cachingStats.hits / this.cachingStats.totalRequests : 0;
        return {
            ...this.cachingStats,
            effectiveness
        };
    }

    /**
     * Gets the cache instance
     * @returns {TemporalCache} The temporal cache instance
     */
    getCache() {
        return this.cache;
    }

    /**
     * Clears the temporal cache
     */
    clearCache() {
        if (this.cache) {
            this.cache.clear();
            info('Temporal cache cleared');
        }
    }

    /**
     * Gets cache statistics
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        if (this.cache) {
            return this.cache.getStats();
        }
        return null;
    }

    /**
     * Performs cache maintenance (removes expired entries)
     */
    cleanupCache() {
        if (this.cache) {
            this.cache.cleanup();
        }
    }
}

export default TemporalReasoner;