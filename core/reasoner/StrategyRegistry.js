/**
 * High-quality StrategyRegistry for managing both legacy combination strategies and new reasoning strategies
 * This refactored version improves maintainability, performance, and extensibility
 */

import {error as logError, info, warn} from '../utils/logger.js';
import {ReasoningStrategy} from './StrategyInterface.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('StrategyRegistry');

class StrategyRegistry {
    /**
     * Creates a StrategyRegistry instance
     */
    constructor() {
        // For combination sampling strategies (existing functionality)
        this.combinationStrategies = new Map();

        // For task reasoning strategies (new functionality)
        this.reasoningStrategies = new Map();

        // Cache instances to avoid repeated construction
        this.combinationStrategyInstances = new Map();
        this.reasoningStrategyInstances = new Map();

        // Cache metadata for better performance
        this.reasoningMetadataCache = new Map();

        // Track strategy statistics
        this.strategyUsageStats = new Map();

        info('StrategyRegistry initialized');
    }

    // ========================================================================
    // Registration Methods
    // ========================================================================

    /**
     * Backward-compatible register method for existing code
     * For backward compatibility, this method registers strategies as combination strategies
     * without strict validation to maintain compatibility with existing tests
     * @param {string} name - Name of the strategy
     * @param {Function} strategyClass - The strategy class constructor
     */
    register(name, strategyClass) {
        // For backward compatibility, register as a combination strategy with minimal validation
        // This maintains compatibility with existing tests that use simple mock classes
        if (this.combinationStrategies.has(name)) {
            warn(`Combination strategy "${name}" is already registered. Overwriting.`);
        }

        this.combinationStrategies.set(name, strategyClass);
        this._initStrategyStats(name, 'combination');

        info(`Registered combination strategy: ${name}`);
    }

    /**
     * Register multiple strategy classes at once
     * This method automatically detects the type of strategy and registers it appropriately
     * @param {Array<Function>} strategyClasses - Array of strategy classes to register
     */
    registerStrategies(strategyClasses) {
        if (!Array.isArray(strategyClasses)) {
            throw new Error('strategyClasses must be an array');
        }

        for (const StrategyClass of strategyClasses) {
            // Detect strategy type and register appropriately
            if (this._isReasoningStrategyClass(StrategyClass)) {
                // This is a new reasoning strategy
                try {
                    const metadata = new StrategyClass().getMetadata();
                    if (metadata && metadata.name) {
                        this.registerReasoningStrategy(metadata.name, StrategyClass);
                    } else {
                        warn(`Reasoning strategy class ${StrategyClass.name} has invalid metadata, skipping registration`);
                    }
                } catch (error) {
                    warn(`Error getting metadata from reasoning strategy ${StrategyClass.name}:`, error.message);
                }
            } else if (this._hasSelectCombinationsMethod(StrategyClass)) {
                // This is a legacy combination sampling strategy
                const strategyName = StrategyClass.name || this._generateStrategyName(StrategyClass);
                this.registerCombinationStrategy(strategyName, StrategyClass);
            } else {
                // For backward compatibility, register as a combination strategy if it doesn't match known interfaces
                const strategyName = StrategyClass.name || this._generateStrategyName(StrategyClass);
                this.registerCombinationStrategy(strategyName, StrategyClass);
                warn(`Strategy class ${StrategyClass.name} does not match expected interfaces, registering as combination strategy`);
            }
        }
    }

    /**
     * Register a new reasoning strategy (implements ReasoningStrategy interface)
     * @param {string} name - Unique name for the strategy
     * @param {Function} strategyClass - The strategy class constructor
     */
    registerReasoningStrategy(name, strategyClass) {
        if (!name || typeof name !== 'string') {
            throw new Error('Strategy name must be a non-empty string');
        }

        if (typeof strategyClass !== 'function') {
            throw new Error('Strategy class must be a constructor function');
        }

        // Validate the reasoning strategy class
        if (!this._isReasoningStrategyClass(strategyClass)) {
            throw new Error(`Strategy class for "${name}" does not implement ReasoningStrategy interface properly.`);
        }

        if (this.reasoningStrategies.has(name)) {
            warn(`Reasoning strategy "${name}" is already registered. Overwriting.`);
        }

        this.reasoningStrategies.set(name, strategyClass);
        this._invalidateReasoningMetadataCache(name); // Clear cache since strategy changed
        this._initStrategyStats(name, 'reasoning');

        info(`Registered reasoning strategy: ${name}`);
    }

    /**
     * Register a legacy combination sampling strategy
     * @param {string} name - Unique name for the strategy
     * @param {Function} strategyClass - The strategy class constructor
     */
    registerCombinationStrategy(name, strategyClass) {
        if (!name || typeof name !== 'string') {
            throw new Error('Strategy name must be a non-empty string');
        }

        if (typeof strategyClass !== 'function') {
            throw new Error('Strategy class must be a constructor function');
        }

        // Validate the combination strategy class
        if (!this._hasSelectCombinationsMethod(strategyClass)) {
            throw new Error(`Combination strategy class for "${name}" does not have required selectCombinations method.`);
        }

        if (this.combinationStrategies.has(name)) {
            warn(`Combination strategy "${name}" is already registered. Overwriting.`);
        }

        this.combinationStrategies.set(name, strategyClass);
        this._initStrategyStats(name, 'combination');

        info(`Registered combination strategy: ${name}`);
    }

    // ========================================================================
    // Retrieval Methods
    // ========================================================================

    /**
     * Get a combination sampling strategy (legacy functionality)
     * @param {string} name - Name of the strategy to retrieve
     * @returns {object} The strategy instance
     */
    getCombinationStrategy(name) {
        if (!this.combinationStrategies.has(name)) {
            throw new Error(`Combination strategy "${name}" not found.`);
        }

        // Return cached instance if available, otherwise create and cache
        if (!this.combinationStrategyInstances.has(name)) {
            const StrategyClass = this.combinationStrategies.get(name);
            const instance = new StrategyClass();
            this.combinationStrategyInstances.set(name, instance);
            this._recordStrategyUsage(name, 'combination');
        }

        const instance = this.combinationStrategyInstances.get(name);
        this._recordStrategyUsage(name, 'combination');
        return instance;
    }

    /**
     * Get a reasoning strategy (new functionality)
     * @param {string} name - Name of the strategy to retrieve
     * @returns {object} The strategy instance
     */
    getReasoningStrategy(name) {
        if (!this.reasoningStrategies.has(name)) {
            throw new Error(`Reasoning strategy "${name}" not found.`);
        }

        // Return cached instance if available, otherwise create and cache
        if (!this.reasoningStrategyInstances.has(name)) {
            const StrategyClass = this.reasoningStrategies.get(name);
            const instance = new StrategyClass();
            this.reasoningStrategyInstances.set(name, instance);
            this._recordStrategyUsage(name, 'reasoning');
        }

        const instance = this.reasoningStrategyInstances.get(name);
        this._recordStrategyUsage(name, 'reasoning');
        return instance;
    }

    /**
     * Get strategy by name - tries both types, prioritizing reasoning strategies
     * @param {string} name - Name of the strategy to retrieve
     * @returns {object} The strategy instance
     */
    getStrategy(name) {
        if (this.reasoningStrategies.has(name)) {
            return this.getReasoningStrategy(name);
        }

        if (this.combinationStrategies.has(name)) {
            return this.getCombinationStrategy(name);
        }

        throw new Error(`Strategy "${name}" not found.`);
    }

    // ========================================================================
    // Query Methods
    // ========================================================================

    /**
     * Get names of all registered strategies
     * @returns {string[]} Array of all strategy names
     */
    getStrategyNames() {
        return [
            ...this.combinationStrategies.keys(),
            ...this.reasoningStrategies.keys()
        ];
    }

    /**
     * Get names of just the reasoning strategies
     * @returns {string[]} Array of reasoning strategy names
     */
    getReasoningStrategyNames() {
        return [...this.reasoningStrategies.keys()];
    }

    /**
     * Get names of just the combination strategies
     * @returns {string[]} Array of combination strategy names
     */
    getCombinationStrategyNames() {
        return [...this.combinationStrategies.keys()];
    }

    /**
     * Get all reasoning strategies with metadata
     * @returns {Array<{name: string, metadata: object, instance: object}>} Array of strategy information
     */
    getAllReasoningStrategies() {
        return this.getReasoningStrategyNames().map(name => ({
            name,
            metadata: this.getStrategyMetadata(name),
            instance: this.getReasoningStrategy(name)
        }));
    }

    /**
     * Get metadata for a reasoning strategy
     * @param {string} name - Name of the strategy
     * @returns {object} Strategy metadata
     */
    getStrategyMetadata(name) {
        if (!this.reasoningMetadataCache.has(name)) {
            const strategy = this.getReasoningStrategy(name);
            try {
                const metadata = strategy.getMetadata();
                this.reasoningMetadataCache.set(name, metadata);
            } catch (error) {
                logError(`Error getting metadata for reasoning strategy "${name}":`, error);
                // Return default metadata on error
                this.reasoningMetadataCache.set(name, {
                    name,
                    description: `Error loading metadata for ${name}`,
                    supportedTaskTypes: [],
                    category: 'unknown',
                    priority: 0.5
                });
            }
        }
        return this.reasoningMetadataCache.get(name);
    }

    /**
     * Find all reasoning strategies that can handle a given task in the provided context
     * @param {Task} task - The task to check
     * @param {SystemContext} context - The system context
     * @param {object} [options] - Options for the search
     * @param {number} [options.minPriority=0] - Minimum priority threshold
     * @param {string[]} [options.allowedCategories] - Only consider strategies in these categories
     * @returns {Array<{name: string, instance: ReasoningStrategy, metadata: object}>} Matching strategies
     */
    findApplicableStrategies(task, context, options = {}) {
        const {
            minPriority = 0,
            allowedCategories = null
        } = options;

        const applicable = [];

        for (const [name, instance] of this.reasoningStrategyInstances.entries()) {
            try {
                // Get metadata to check constraints
                const metadata = this.getStrategyMetadata(name);

                // Check category filter if specified
                if (allowedCategories && allowedCategories.length > 0 &&
                    !allowedCategories.includes(metadata.category)) {
                    continue;
                }

                // Check minimum priority
                if ((metadata.priority || 0.5) < minPriority) {
                    continue;
                }

                // Check if the strategy can handle the task
                if (instance.canHandle(task, context)) {
                    applicable.push({
                        name,
                        instance,
                        metadata
                    });
                }
            } catch (error) {
                warn(`Error checking if reasoning strategy "${name}" can handle task:`, error.message);
            }
        }

        // Sort by priority defined in metadata
        applicable.sort((a, b) => {
            return (b.metadata.priority || 0) - (a.metadata.priority || 0);
        });

        return applicable;
    }

    // ========================================================================
    // Management Methods
    // ========================================================================

    /**
     * Unregister a strategy
     * @param {string} name - Name of the strategy to unregister
     */
    unregister(name) {
        let unregistered = false;

        if (this.reasoningStrategies.has(name)) {
            this.reasoningStrategies.delete(name);
            this.reasoningStrategyInstances.delete(name);
            this.reasoningMetadataCache.delete(name);
            this.strategyUsageStats.delete(name);
            info(`Unregistered reasoning strategy: ${name}`);
            unregistered = true;
        }

        if (this.combinationStrategies.has(name)) {
            this.combinationStrategies.delete(name);
            this.combinationStrategyInstances.delete(name);
            if (!unregistered) {
                // Only log if this wasn't already logged as a reasoning strategy
                this.strategyUsageStats.delete(name);
                info(`Unregistered combination strategy: ${name}`);
            }
            unregistered = true;
        }

        if (!unregistered) {
            warn(`Strategy "${name}" not found for unregistration`);
        }
    }

    /**
     * Clear all strategies from the registry
     */
    clear() {
        this.combinationStrategies.clear();
        this.reasoningStrategies.clear();
        this.combinationStrategyInstances.clear();
        this.reasoningStrategyInstances.clear();
        this.reasoningMetadataCache.clear();
        this.strategyUsageStats.clear();

        info('StrategyRegistry cleared all strategies');
    }

    /**
     * Validate a strategy class to check if it implements the ReasoningStrategy interface
     * @param {Function} StrategyClass - The strategy class to validate
     * @returns {boolean} Whether the class implements the interface correctly
     */
    _isReasoningStrategyClass(StrategyClass) {
        try {
            const instance = new StrategyClass();
            return (
                typeof instance.canHandle === 'function' &&
                typeof instance.execute === 'function' &&
                typeof instance.getMetadata === 'function' &&
                typeof instance.validate === 'function'
            );
        } catch (error) {
            // If construction fails, it's not a valid strategy
            return false;
        }
    }

    /**
     * Check if a class has the selectCombinations method (legacy strategy)
     * @param {Function} StrategyClass - The strategy class to check
     * @returns {boolean} Whether the class has the method
     */
    _hasSelectCombinationsMethod(StrategyClass) {
        try {
            const instance = new StrategyClass();
            return typeof instance.selectCombinations === 'function';
        } catch (error) {
            // If construction fails, assume it doesn't have the method
            return false;
        }
    }

    /**
     * Generate a strategy name based on the constructor name
     * @private
     * @param {Function} StrategyClass - The strategy class
     * @returns {string} Generated name
     */
    _generateStrategyName(StrategyClass) {
        // Remove "Strategy" suffix if present and return the name
        let name = StrategyClass.name || 'UnnamedStrategy';
        if (name.endsWith('Strategy')) {
            name = name.slice(0, -8); // Remove "Strategy"
        }
        return name;
    }

    /**
     * Initialize usage statistics for a strategy
     * @private
     * @param {string} name - Strategy name
     * @param {string} type - Strategy type ('reasoning' or 'combination')
     */
    _initStrategyStats(name, type) {
        if (!this.strategyUsageStats.has(name)) {
            this.strategyUsageStats.set(name, {
                type,
                usageCount: 0,
                lastUsed: null,
                errors: 0
            });
        }
    }

    /**
     * Record usage of a strategy
     * @private
     * @param {string} name - Strategy name
     * @param {string} type - Strategy type
     */
    _recordStrategyUsage(name, type) {
        if (!this.strategyUsageStats.has(name)) {
            this._initStrategyStats(name, type);
        }

        const stats = this.strategyUsageStats.get(name);
        stats.usageCount++;
        stats.lastUsed = Date.now();
    }

    /**
     * Record an error for a strategy
     * @private
     * @param {string} name - Strategy name
     */
    _recordStrategyError(name) {
        if (!this.strategyUsageStats.has(name)) {
            return; // Strategy may not be registered
        }

        const stats = this.strategyUsageStats.get(name);
        stats.errors++;
    }

    /**
     * Invalidate the metadata cache for a strategy
     * @private
     * @param {string} name - Strategy name
     */
    _invalidateReasoningMetadataCache(name) {
        this.reasoningMetadataCache.delete(name);
    }

    /**
     * Get usage statistics for strategies
     * @returns {object} Statistics about strategy usage
     */
    getUsageStats() {
        const stats = {
            totalStrategies: this.getStrategyNames().length,
            totalReasoningStrategies: this.getReasoningStrategyNames().length,
            totalCombinationStrategies: this.getCombinationStrategyNames().length,
            strategyDetails: {}
        };

        for (const [name, stat] of this.strategyUsageStats.entries()) {
            stats.strategyDetails[name] = {...stat};
        }

        return stats;
    }
}

export default StrategyRegistry;