/**\n * High-quality TemporalReasoner for temporal inference and pattern recognition\n * This refactored version improves maintainability, performance, and extensibility\n */

import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {debug, info} from '../utils/logger.js';
import * as TemporalModules from './temporal/index.js';
import createConfigAccessor from '../config/ConfigAccessor.js';

const errorHandler = createUnifiedErrorHandler('TemporalReasoner');

class TemporalReasoner {
    /**
     * Creates a TemporalReasoner instance
     * @param {ConfigManager} configManager - System configuration manager
     */
    constructor(configManager) {
        this.config = createConfigAccessor(configManager, 'temporal');

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

        // Performance tracking
        this.performanceStats = new Map();

        // Caching metrics
        this.cachingStats = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };

        this.metricsService = null; // Will be set via dependency injection

        info(`TemporalReasoner initialized with ${this.inferenceModules.length} inference modules`);
    }

    /**
     * Performs temporal inference on a set of tasks
     * @param {Task[]} tasks - Array of tasks to perform temporal reasoning on
     * @param {object} [options] - Options for temporal inference
     * @param {boolean} [options.enableAllModules=true] - Whether to run all modules
     * @param {string[]} [options.enabledModules] - Specific modules to enable (if provided, overrides enableAllModules)
     * @returns {Task[]} Array of temporally-derived tasks
     */
    infer(tasks, options = {}) {
        const config = this.config.get('temporal');

        if (!config) {
            debug('Temporal reasoning disabled - no temporal config found');
            return [];
        }

        const {
            enableAllModules = true,
            enabledModules = null
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

        // Run all selected inference modules
        const allInferredTasks = modulesToRun.flatMap(InferenceModule => {
            const moduleName = this._getModuleName(InferenceModule);
            const result = errorHandler.executeSync(() => {
                // Track performance for this module
                const startTime = Date.now();
                const result = InferenceModule.infer(tasks, config);
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
     * @returns {Task[]} Array of temporally-derived tasks
     */
    selectiveInfer(tasks, moduleNames) {
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
                const result = module.infer(tasks, config);
                const endTime = Date.now();

                this._updatePerformanceStats(moduleName, endTime - startTime, Array.isArray(result) ? result.length : 0);

                return Array.isArray(result) ? result : [];
            }, `selectiveInfer:${moduleName}`, []);

            results.push(...result);
        }

        return results;
    }

    /**
     * Detects temporal patterns in the given tasks
     * @param {Task[]} tasks - Array of tasks to analyze
     * @returns {object[]} Array of detected temporal patterns
     */
    detectTemporalPatterns(tasks) {
        const config = this.config.get('temporal');

        if (!config) {
            return [];
        }

        return errorHandler.executeSync(() => {
            return TemporalModules.TemporalPatternDetection?.detect?.(tasks, config) || [];
        }, 'detectTemporalPatterns', []);
    }

    /**
     * Predicts future tasks based on temporal patterns
     * @param {Task[]} tasks - Array of tasks to base predictions on
     * @returns {Task[]} Array of predicted future tasks
     */
    predictFutureTasks(tasks) {
        const config = this.config.get('temporal');

        if (!config) {
            return [];
        }

        return errorHandler.executeSync(() => {
            return TemporalModules.FutureTaskPrediction?.predict?.(tasks, config) || [];
        }, 'predictFutureTasks', []);
    }

    /**
     * Gets performance statistics for temporal reasoning modules
     * @returns {object} Performance statistics
     */
    getPerformanceStats() {
        const stats = {};
        for (const [moduleName, moduleStats] of this.performanceStats) {
            stats[moduleName] = {
                ...moduleStats,
                averageExecutionTime: moduleStats.totalExecutionTime / moduleStats.callCount,
                tasksPerSecond: moduleStats.totalTasksGenerated / (moduleStats.totalExecutionTime / 1000 || 1)
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
}

export default TemporalReasoner;