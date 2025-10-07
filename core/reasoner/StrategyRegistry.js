import {error as logError, info, warn} from '../utils/logger.js';
import {calculateEffectiveness} from '../utils/effectiveness-utils.js';

class StrategyRegistry {
    constructor(metricsService = null) {
        this.strategies = new Map();
        this.instances = new Map();
        this.metadata = new Map();
        this.stats = new Map();
        this.metricsService = metricsService;
        
        // Enhanced strategy selection properties
        this.lmService = null;
        this.contextualSelectionEnabled = true;
        this.taskHistory = new Map(); // Track task characteristics for learning
        
        info('StrategyRegistry initialized');
    }

    // Method to set the LM service for enhanced strategy selection
    setLMService(lmService) {
        this.lmService = lmService;
        info('LM service set for StrategyRegistry');
    }

    register(name, strategyClass) {
        if (this.strategies.has(name)) {
            warn(`Strategy "${name}" is already registered. Overwriting.`);
        }
        this.strategies.set(name, strategyClass);
        this._initStats(name, 'combination');
        info(`Registered strategy: ${name}`);
    }

    registerStrategies(strategyClasses) {
        if (!Array.isArray(strategyClasses)) throw new Error('strategyClasses must be an array');

        for (const StrategyClass of strategyClasses) {
            const isReasoning = this._isReasoning(StrategyClass);
            const isCombination = this._isCombination(StrategyClass);

            if (isReasoning) {
                try {
                    const metadata = new StrategyClass().getMetadata();
                    if (metadata?.name) {
                        this._register(metadata.name, StrategyClass, 'reasoning');
                    }
                } catch (error) {
                    warn(`Error registering reasoning strategy ${StrategyClass.name}: ${error.message}`);
                }
            } else if (isCombination) {
                const name = StrategyClass.name || this._nameFromClass(StrategyClass);
                this._register(name, StrategyClass, 'combination');
            } else {
                const name = StrategyClass.name || this._nameFromClass(StrategyClass);
                this._register(name, StrategyClass, 'combination');
                warn(`Strategy class ${StrategyClass.name} registered as combination strategy`);
            }
        }
    }

    registerReasoningStrategy(name, strategyClass) {
        this._validateName(name);
        this._validateClass(strategyClass);
        if (!this._isReasoning(strategyClass)) {
            throw new Error(`Strategy class for "${name}" does not implement ReasoningStrategy interface.`);
        }
        this._register(name, strategyClass, 'reasoning');
    }

    registerCombinationStrategy(name, strategyClass) {
        this._validateName(name);
        this._validateClass(strategyClass);
        if (!this._isCombination(strategyClass)) {
            throw new Error(`Strategy class for "${name}" does not have required selectCombinations method.`);
        }
        this._register(name, strategyClass, 'combination');
    }

    _register(name, strategyClass, type) {
        this.strategies.set(name, strategyClass);
        this.metadata.delete(name);
        this._initStats(name, type);
    }

    _validateName(name) {
        if (!name || typeof name !== 'string') throw new Error('Strategy name must be a non-empty string');
    }

    _validateClass(strategyClass) {
        if (typeof strategyClass !== 'function') throw new Error('Strategy class must be a constructor function');
    }

    getStrategy(name) {
        if (!this.strategies.has(name)) throw new Error(`Strategy "${name}" not found.`);

        if (!this.instances.has(name)) {
            const StrategyClass = this.strategies.get(name);
            this.instances.set(name, new StrategyClass());
            this._recordUsage(name);
        }

        this._recordUsage(name);
        return this.instances.get(name);
    }

    getCombinationStrategy(name) {
        return this.getStrategy(name);
    }

    getReasoningStrategy(name) {
        return this.getStrategy(name);
    }

    getStrategyNames() {
        return [...this.strategies.keys()];
    }

    getReasoningStrategyNames() {
        return this.getStrategyNames();
    }

    getCombinationStrategyNames() {
        return this.getStrategyNames();
    }

    getAllReasoningStrategies() {
        return this.getStrategyNames().map(name => ({
            name,
            metadata: this.getStrategyMetadata(name),
            instance: this.getStrategy(name)
        }));
    }

    getStrategyMetadata(name) {
        if (!this.metadata.has(name)) {
            try {
                const strategy = this.getStrategy(name);
                this.metadata.set(name, strategy.getMetadata());
            } catch (error) {
                logError(`Error getting metadata for strategy "${name}":`, error);
                this.metadata.set(name, {
                    name,
                    description: `Error loading metadata for ${name}`,
                    supportedTaskTypes: [],
                    category: 'unknown',
                    priority: 0.5
                });
            }
        }
        return this.metadata.get(name);
    }

    findApplicableStrategies(task, context, options = {}) {
        const {minPriority = 0, allowedCategories = null} = options;
        const applicable = [];

        for (const name of this.strategies.keys()) {
            try {
                const instance = this.getStrategy(name);
                const metadata = this.getStrategyMetadata(name);

                if (allowedCategories?.length && !allowedCategories.includes(metadata.category)) continue;
                if ((metadata.priority || 0.5) < minPriority) continue;
                if (instance.canHandle(task, context)) {
                    applicable.push({name, instance, metadata});
                }
            } catch (error) {
                warn(`Error checking strategy "${name}": ${error.message}`);
            }
        }

        return applicable.sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0));
    }

    /**
     * Enhanced method to find and rank applicable strategies based on performance analytics and task context
     */
    findApplicableStrategiesWithAnalytics(task, context, options = {}) {
        const {minPriority = 0, allowedCategories = null, taskType = 'default'} = options;
        const applicable = this.findApplicableStrategies(task, context, options);

        // Add performance analytics to each applicable strategy
        return applicable.map(strategy => {
            const {name, instance, metadata} = strategy;
            const stats = this.stats.get(name) || {};
            
            // Calculate success rate for this strategy
            const successRate = stats.successes ? stats.successes / (stats.executions || 1) : 0;
            
            // Get strategy effectiveness (combining success rate and execution time)
            const averageTime = stats.averageTime || 0;
            const effectiveness = calculateEffectiveness(successRate, averageTime);
            
            // Add contextual information if available
            const taskContextScore = this._getTaskContextScore(task, name, taskType);
            
            return {
                name,
                instance,
                metadata,
                stats: {
                    ...stats,
                    successRate,
                    effectiveness,
                    taskContextScore
                }
            };
        });
    }

    /**
     * Select the best strategy based on performance analytics and contextual information
     */
    async selectBestStrategy(task, context, options = {}) {
        const {taskType = 'default', requiredCapabilities = []} = options;
        const applicable = this.findApplicableStrategiesWithAnalytics(task, context, options);

        if (applicable.length === 0) {
            return null;
        }

        // If LM service is available, use it to predict the optimal strategy
        if (this.lmService && this.contextualSelectionEnabled) {
            const bestStrategy = await this._predictBestStrategyWithLM(applicable, task, context, taskType);
            if (bestStrategy) {
                return bestStrategy;
            }
        }

        // Fallback to performance-based selection
        return this._selectBestStrategyByPerformance(applicable, taskType);
    }

    /**
     * Use LM to predict the best strategy based on task characteristics and historical performance
     */
    async _predictBestStrategyWithLM(applicableStrategies, task, context, taskType) {
        try {
            if (!this.lmService) return null;
            
            // Create a context-aware prompt for strategy selection
            const taskDescription = this._describeTask(task);
            const strategyContext = applicableStrategies.map(strat => ({
                name: strat.name,
                description: strat.metadata.description,
                category: strat.metadata.category,
                successRate: strat.stats.successRate,
                averageTime: strat.stats.averageTime
            }));

            const prompt = `
You are an intelligent strategy selector for a neuro-symbolic reasoning system. 
Based on the given task and available strategies, select the most appropriate strategy.

Task Description: ${taskDescription}
Task Type: ${taskType}
Available Strategies: ${JSON.stringify(strategyContext, null, 2)}

Consider:
- Historical success rates of each strategy
- Contextual fit for the task type
- Performance characteristics (execution time)
- Task complexity and requirements

Return only the name of the best strategy to use.
`;

            const result = await this.lmService.generate(prompt);
            if (result) {
                const strategyName = result.trim();
                const selected = applicableStrategies.find(s => s.name === strategyName);
                if (selected) {
                    return selected;
                }
            }
        } catch (error) {
            warn(`LM strategy prediction failed: ${error.message}`);
            // Fall back to performance-based selection
        }

        return null; // Will fallback to performance-based selection
    }

    /**
     * Select the best strategy based on performance analytics
     */
    _selectBestStrategyByPerformance(applicableStrategies, taskType) {
        // Sort by effectiveness (success rate adjusted by execution time) and contextual score
        return applicableStrategies.sort((a, b) => {
            const effectivenessA = a.stats.effectiveness + (a.stats.taskContextScore || 0);
            const effectivenessB = b.stats.effectiveness + (b.stats.taskContextScore || 0);
            return effectivenessB - effectivenessA; // Higher effectiveness first
        })[0];
    }

    /**
     * Get a score representing how well a strategy matches the task context
     */
    _getTaskContextScore(task, strategyName, taskType) {
        // Check if this strategy has performed well on similar task types historically
        const stats = this.stats.get(strategyName) || {};
        if (!stats.taskTypePerformance) return 0;

        // Return performance score for this specific task type, or default to overall success rate
        return stats.taskTypePerformance[taskType] || (stats.successes ? stats.successes / (stats.executions || 1) : 0);
    }

    /**
     * Analyze task characteristics for contextual strategy selection
     */
    analyzeTaskCharacteristics(task) {
        if (!task) return {type: 'unknown', complexity: 0, confidence: 0.5, frequency: 0.5};
        
        const characteristics = {
            type: task.type || 'unknown',
            complexity: task.term ? (task.term.key ? task.term.key.length : 1) : 1,
            confidence: task.truth?.confidence || 0.5,
            frequency: task.truth?.frequency || 0.5,
            termStructure: task.term?.structuredTerm ? task.term.structuredTerm.type : 'atomic',
            taskSize: JSON.stringify(task).length
        };
        
        // If the task has more complex structured information, add that
        if (task.term?.structuredTerm) {
            characteristics.complexity = this._calculateTermComplexity(task.term.structuredTerm);
        }
        
        return characteristics;
    }

    /**
     * Calculate term complexity based on structure
     */
    _calculateTermComplexity(structuredTerm) {
        if (!structuredTerm) return 1;
        
        switch (structuredTerm.type) {
            case 'Conjunction':
                return 2 + (structuredTerm.terms?.reduce((sum, term) => sum + this._calculateTermComplexity(term), 0) || 0);
            case 'Implication':
                return 3 + (this._calculateTermComplexity(structuredTerm.subject) || 0) + 
                            (this._calculateTermComplexity(structuredTerm.predicate) || 0);
            case 'Negation':
                return 2 + (this._calculateTermComplexity(structuredTerm.term) || 0);
            case 'Set':
            case 'ExtensionalSet':
            case 'IntensionalSet':
                return 2 + (structuredTerm.elements?.reduce((sum, term) => sum + this._calculateTermComplexity(term), 0) || 0);
            default:
                return 1; // Atomic terms
        }
    }

    /**
     * Calculate strategy effectiveness combining success rate and execution time
     * DEPRECATED: Use utility function from effectiveness-utils.js
     */
    _calculateEffectiveness(successRate, averageTime) {
        // DEPRECATED: Use utility function instead
        return calculateEffectiveness(successRate, averageTime);
    }

    /**
     * Describe a task for LM-based strategy selection
     */
    _describeTask(task) {
        if (!task) return 'unknown task';
        
        const parts = [];
        if (task.term) {
            parts.push(`Term: ${task.term.key}`);
        }
        if (task.type) {
            parts.push(`Type: ${task.type}`);
        }
        if (task.truth) {
            parts.push(`Truth: {frequency: ${task.truth.frequency}, confidence: ${task.truth.confidence}}`);
        }
        
        return parts.length > 0 ? parts.join(', ') : JSON.stringify(task);
    }

    /**
     * Track strategy selection context for learning
     */
    _recordTaskContext(task, selectedStrategyName, taskType, success) {
        const taskKey = task.term ? task.term.key : 'unknown';
        
        // Update task history for learning
        if (!this.taskHistory.has(taskKey)) {
            this.taskHistory.set(taskKey, []);
        }
        
        this.taskHistory.get(taskKey).push({
            strategy: selectedStrategyName,
            taskType,
            success,
            timestamp: Date.now(),
            task: JSON.stringify(task)
        });

        // Update strategy stats with task type performance
        const stats = this.stats.get(selectedStrategyName);
        if (stats) {
            if (!stats.taskTypePerformance) {
                stats.taskTypePerformance = {};
            }
            
            const performance = stats.taskTypePerformance[taskType] || {count: 0, successes: 0};
            performance.count++;
            if (success) performance.successes++;
            
            // Calculate updated success rate for this task type
            stats.taskTypePerformance[taskType] = performance;
        }
    }

    unregister(name) {
        if (this.strategies.has(name)) {
            this.strategies.delete(name);
            this.instances.delete(name);
            this.metadata.delete(name);
            this.stats.delete(name);
            info(`Unregistered strategy: ${name}`);
        } else {
            warn(`Strategy "${name}" not found for unregistration`);
        }
    }

    clear() {
        this.strategies.clear();
        this.instances.clear();
        this.metadata.clear();
        this.stats.clear();
        info('StrategyRegistry cleared all strategies');
    }

    async executeStrategy(strategyName, task, systemContext, options = {}) {
        const startTime = Date.now();
        let success = false;
        let result;
        const {taskType = 'default'} = options;

        try {
            const strategy = this.getStrategy(strategyName);
            const validation = strategy.validate(task);
            
            if (validation.isValid) {
                result = await Promise.resolve(strategy.execute(task, systemContext));
                success = result && result.success !== false;
            } else {
                result = { success: false, errors: validation.errors };
            }
        } catch (error) {
            result = { success: false, error: error.message };
        } finally {
            const executionTime = Date.now() - startTime;
            
            // Track in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackStrategyExecution(strategyName, success, executionTime);
            }
            
            // Update internal stats
            this._updateInternalStats(strategyName, success, executionTime);
            
            // Record task context for learning (enhanced strategy selection)
            this._recordTaskContext(task, strategyName, taskType, success);
        }

        return result;
    }

    _updateInternalStats(name, success, executionTime) {
        const stats = this.stats.get(name);
        if (stats) {
            if (!stats.totalTime) stats.totalTime = 0;
            if (!stats.executions) stats.executions = 0;
            stats.totalTime += executionTime;
            stats.executions++; // Track total executions
            stats.averageTime = stats.totalTime / stats.executions;
            
            if (success) {
                stats.successes = (stats.successes || 0) + 1;
            } else {
                stats.failures = (stats.failures || 0) + 1;
            }
        }
    }

    _isReasoning(StrategyClass) {
        try {
            const instance = new StrategyClass();
            return typeof instance.canHandle === 'function' &&
                typeof instance.execute === 'function' &&
                typeof instance.getMetadata === 'function' &&
                typeof instance.validate === 'function';
        } catch {
            return false;
        }
    }

    _isCombination(StrategyClass) {
        try {
            const instance = new StrategyClass();
            return typeof instance.selectCombinations === 'function';
        } catch {
            return false;
        }
    }

    _nameFromClass(StrategyClass) {
        let name = StrategyClass.name || 'UnnamedStrategy';
        return name.endsWith('Strategy') ? name.slice(0, -8) : name;
    }

    _initStats(name, type) {
        if (!this.stats.has(name)) {
            this.stats.set(name, {
                type, 
                usageCount: 0, 
                executions: 0,  // Track total executions separately from usage
                successes: 0, 
                failures: 0,
                totalTime: 0,
                averageTime: 0,
                lastUsed: null, 
                errors: 0,
                taskTypePerformance: {}  // Initialize task type performance tracking
            });
        }
    }

    _recordUsage(name) {
        const stats = this.stats.get(name);
        if (stats) {
            stats.usageCount++;
            stats.lastUsed = Date.now();
        }
    }

    _recordError(name) {
        const stats = this.stats.get(name);
        if (stats) stats.errors++;
    }

    getUsageStats() {
        return {
            totalStrategies: this.strategies.size,
            strategyDetails: Object.fromEntries([...this.stats.entries()].map(([k, v]) => [k, {...v}]))
        };
    }

    /**
     * Get strategy success rate report for debugging and optimization
     */
    getStrategySuccessRateReport() {
        const report = {};
        
        for (const [name, stats] of this.stats.entries()) {
            const totalExecutions = stats.executions || 0;
            const successes = stats.successes || 0;
            const successRate = totalExecutions > 0 ? successes / totalExecutions : 0;
            
            report[name] = {
                ...stats,
                successRate,
                successPercentage: (successRate * 100).toFixed(2) + '%',
                totalExecutions
            };
            
            // Include task type performance if available
            if (stats.taskTypePerformance) {
                report[name].taskTypePerformance = {};
                for (const [taskType, perf] of Object.entries(stats.taskTypePerformance)) {
                    report[name].taskTypePerformance[taskType] = {
                        ...perf,
                        successRate: perf.count > 0 ? perf.successes / perf.count : 0,
                        successPercentage: perf.count > 0 ? ((perf.successes / perf.count) * 100).toFixed(2) + '%' : '0.00%'
                    };
                }
            }
        }
        
        return report;
    }

    /**
     * Get strategy effectiveness ranking
     */
    getStrategyEffectivenessRanking() {
        const strategyRanks = [];
        
        for (const [name, stats] of this.stats.entries()) {
            const totalExecutions = stats.executions || 0;
            const successes = stats.successes || 0;
            const successRate = totalExecutions > 0 ? successes / totalExecutions : 0;
            const averageTime = stats.averageTime || 0;
            const effectiveness = calculateEffectiveness(successRate, averageTime);
            
            strategyRanks.push({
                name,
                effectiveness,
                successRate,
                averageTime,
                totalExecutions,
                successes,
                failures: stats.failures || 0
            });
        }
        
        return strategyRanks.sort((a, b) => b.effectiveness - a.effectiveness);
    }
}

export default StrategyRegistry;