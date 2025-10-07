import {resolutionStrategies} from './resolution/index.js';
import {CONTRADICTION_SEVERITY_WEIGHTS} from '../contradiction-types.js';
import {SystemCommands} from '../../system/SystemCommands.js';

class ResolutionStrategy {
    constructor(truthValueManager, metricsService = null, commandBus = null) {
        this.truthValueManager = truthValueManager;
        this.metricsService = metricsService;
        this.commandBus = commandBus; // For LM explanation integration via command bus
        this.strategies = resolutionStrategies;
        // Initialize effectiveness tracking by contradiction type
        this.effectiveStrategies = new Map(); // Map of contradiction types to strategy effectiveness
        this.outcomeTracking = new Map(); // Track resolution outcomes by contradiction type
        this.contradictionTypeWeights = CONTRADICTION_SEVERITY_WEIGHTS; // Use existing contradiction weights
    }

    async resolve(contradiction, strategy) {
        const startTime = Date.now();
        const selectedStrategy = strategy === 'auto' ? this._selectOptimalResolutionStrategy(contradiction) : strategy;
        const executor = this.strategies[selectedStrategy] || this.strategies.monitoring;

        if (!executor) {
            const result = this.strategies.monitoring ? this.strategies.monitoring(contradiction, {}) : [];
            
            // Track resolution in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type, 
                    strategy || 'monitoring', 
                    result.length > 0, 
                    result.length > 0 ? 'success' : 'failure'
                );
            }
            
            // Track outcome for effectiveness feedback
            this._trackOutcome(contradiction.type, strategy || 'monitoring', result.length > 0);
            
            // Generate explanation if command bus is available
            await this._generateExplanation(contradiction, selectedStrategy, result.length > 0, startTime);
            
            return result;
        }

        const context = {
            truthValueManager: this.truthValueManager
        };

        try {
            const result = executor(contradiction, context);
            const executionTime = Date.now() - startTime;
            
            // Track resolution in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type, 
                    selectedStrategy, 
                    result && result.length > 0, 
                    result && result.length > 0 ? 'success' : 'failure'
                );
            }
            
            // Track outcome for effectiveness feedback
            this._trackOutcome(contradiction.type, selectedStrategy, result && result.length > 0, executionTime);
            
            // Generate explanation if command bus is available
            await this._generateExplanation(contradiction, selectedStrategy, result && result.length > 0, executionTime);
            
            return result;
        } catch (error) {
            // Track failure in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type, 
                    selectedStrategy, 
                    false, 
                    'error'
                );
            }
            
            // Track outcome for effectiveness feedback
            this._trackOutcome(contradiction.type, selectedStrategy, false, Date.now() - startTime, error.message);
            
            // Generate explanation for failure if command bus is available
            await this._generateExplanation(contradiction, selectedStrategy, false, Date.now() - startTime, error);
            
            // Return an empty array in case of error
            return [];
        }
    }

    /**
     * Generate explanation using LM service for contradiction analysis and resolution rationale
     */
    async _generateExplanation(contradiction, strategy, success, executionTime, error = null) {
        if (!this.commandBus) return;
        
        try {
            const explanationPayload = {
                termKey: 'contradiction_resolution',
                context: {
                    contradiction: {
                        type: contradiction.type,
                        severity: contradiction.severity,
                        details: contradiction.details || 'N/A'
                    },
                    strategy: strategy,
                    outcome: success ? 'success' : 'failure',
                    executionTime: executionTime,
                    error: error ? error.message : null
                }
            };

            // Call the LM service via command bus to generate rationale for the resolution
            await this.commandBus.request(SystemCommands.LM_EXPLAIN, explanationPayload);
        } catch (explanationError) {
            // Don't let explanation service errors break resolution process
            console.warn('Explanation generation failed:', explanationError.message);
        }
    }

    /**
     * Track resolution outcomes for effectiveness feedback
     */
    _trackOutcome(contradictionType, strategy, success, executionTime = 0, errorMessage = null) {
        if (!this.outcomeTracking.has(contradictionType)) {
            this.outcomeTracking.set(contradictionType, []);
        }
        
        // Calculate effectiveness score based on success, execution time, and contradiction type weight
        const baseEffectiveness = this._calculateEffectiveness(success, executionTime);
        const typeWeight = this.contradictionTypeWeights[contradictionType] || 0.5; // Use existing contradiction weight
        const effectiveness = baseEffectiveness * typeWeight;
        
        // Store outcome data
        this.outcomeTracking.get(contradictionType).push({
            strategy,
            success,
            executionTime,
            effectiveness,
            typeWeight,
            timestamp: Date.now(),
            error: errorMessage
        });

        // Update effective strategies map
        this._updateEffectiveStrategy(contradictionType, strategy, success, effectiveness, executionTime);
    }

    /**
     * Calculate effectiveness score based on success and execution time
     */
    _calculateEffectiveness(success, executionTime) {
        if (!success) return 0;
        
        // Simple effectiveness calculation: higher success with faster execution gets higher score
        // Use logarithmic scaling to prevent execution time from overly penalizing faster strategies
        const timeFactor = executionTime > 0 ? Math.log(executionTime + 1) : 0;
        return success ? (1 / (timeFactor + 1)) : 0;
    }

    /**
     * Update effective strategy tracking for a contradiction type
     */
    _updateEffectiveStrategy(contradictionType, strategy, success, effectiveness, executionTime) {
        if (!this.effectiveStrategies.has(contradictionType)) {
            this.effectiveStrategies.set(contradictionType, new Map());
        }

        const strategyMap = this.effectiveStrategies.get(contradictionType);
        if (!strategyMap.has(strategy)) {
            strategyMap.set(strategy, {
                totalAttempts: 0,
                totalSuccesses: 0,
                totalFailures: 0,
                totalEffectiveness: 0,
                averageEffectiveness: 0,
                averageExecutionTime: 0,
                effectivenessHistory: [], // Store recent effectiveness scores
                successRate: 0
            });
        }

        const stats = strategyMap.get(strategy);
        stats.totalAttempts++;
        
        if (success) {
            stats.totalSuccesses++;
        } else {
            stats.totalFailures++;
        }
        
        stats.totalEffectiveness += effectiveness;
        stats.averageEffectiveness = stats.totalEffectiveness / stats.totalAttempts;
        stats.successRate = stats.totalSuccesses / stats.totalAttempts;
        
        // Track execution time
        stats.averageExecutionTime = ((stats.averageExecutionTime * (stats.totalAttempts - 1)) + executionTime) / stats.totalAttempts;
        
        // Store recent effectiveness for trend analysis (keep last 10 entries)
        stats.effectivenessHistory.push(effectiveness);
        if (stats.effectivenessHistory.length > 10) {
            stats.effectivenessHistory.shift();
        }
    }

    _selectOptimalResolutionStrategy(contradiction) {
        // Check if we have effective strategies for this contradiction type
        if (this.effectiveStrategies.has(contradiction.type)) {
            const strategyMap = this.effectiveStrategies.get(contradiction.type);
            if (strategyMap.size > 0) {
                // Find the strategy with the highest average effectiveness
                let bestStrategy = null;
                let bestEffectiveness = -1;
                
                for (const [strategy, stats] of strategyMap) {
                    // Only consider strategies with at least 3 attempts to avoid bias from limited data
                    // Weight strategies based on success rate and recent effectiveness
                    const weightedEffectiveness = this._calculateWeightedEffectiveness(stats);
                    
                    if (stats.totalAttempts >= 3 && weightedEffectiveness > bestEffectiveness) {
                        bestEffectiveness = weightedEffectiveness;
                        bestStrategy = strategy;
                    }
                }
                
                // If we found an effective strategy, use it
                if (bestStrategy) {
                    return bestStrategy;
                }
            }
        }
        
        // If no effective strategy is found, use the original logic with severity-based selection
        // But also consider contradiction type as a factor in strategy selection
        if (contradiction.severity > 0.8) {
            return 'revision';
        }
        if (contradiction.severity > 0.6) {
            return 'reconciliation';
        }
        if (contradiction.tasks.some(t => t.state.stamp?.occurrenceTime)) {
            return 'temporal_analysis';
        }
        if (['inheritance_conflict', 'implication_conflict'].includes(contradiction.type)) {
            return 'causal_analysis';
        }
        if (contradiction.type === 'transitive_inheritance_conflict') {
            return 'hierarchical_reconciliation';
        }
        if (contradiction.severity > 0.4) {
            return 'contextual_reconciliation';
        }
        return 'evidence_gathering';
    }
    
    /**
     * Calculate weighted effectiveness considering both historical performance and recent trends
     */
    _calculateWeightedEffectiveness(stats) {
        // Base effectiveness score
        let effectiveness = stats.averageEffectiveness;
        
        // Add weight for recent performance if we have enough history
        if (stats.effectivenessHistory.length > 0) {
            // Calculate recent effectiveness (average of last entries)
            const recentEffectiveness = stats.effectivenessHistory.slice(-3).reduce((sum, val) => sum + val, 0) / 
                Math.min(3, stats.effectivenessHistory.length);
            
            // Weight recent performance more heavily (0.7) than historical (0.3)
            effectiveness = (0.3 * stats.averageEffectiveness) + (0.7 * recentEffectiveness);
        }
        
        // Boost effectiveness if success rate is high
        if (stats.successRate > 0.8) {
            effectiveness *= 1.2; // 20% boost for high success rates
        } else if (stats.successRate > 0.6) {
            effectiveness *= 1.1; // 10% boost for moderate success rates
        }
        
        // Reduce effectiveness if execution time is too high (relative to other strategies)
        if (stats.averageExecutionTime > 100) { // Adjust threshold as needed
            effectiveness *= 0.9; // 10% penalty for slow execution
        } else if (stats.averageExecutionTime < 50) {
            effectiveness *= 1.05; // 5% boost for fast execution
        }
        
        return effectiveness;
    }
    
    /**
     * Get strategy effectiveness statistics for a specific contradiction type
     */
    getStrategyEffectivenessStats(contradictionType) {
        if (!this.effectiveStrategies.has(contradictionType)) {
            return null;
        }
        
        const strategyMap = this.effectiveStrategies.get(contradictionType);
        const result = {};
        
        for (const [strategy, stats] of strategyMap) {
            result[strategy] = {
                totalAttempts: stats.totalAttempts,
                totalSuccesses: stats.totalSuccesses,
                totalFailures: stats.totalFailures,
                successRate: stats.successRate,
                averageEffectiveness: stats.averageEffectiveness,
                averageExecutionTime: stats.averageExecutionTime
            };
        }
        
        return result;
    }
    
    /**
     * Add feedback to update strategy effectiveness based on external evaluation
     */
    addFeedback(contradictionType, strategy, success, executionTime = 0) {
        this._trackOutcome(contradictionType, strategy, success, executionTime);
    }
    
    /**
     * Get performance metrics for contradiction resolution
     */
    getContradictionResolutionMetrics() {
        const metrics = {
            totalContradictions: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            successRate: 0,
            averageExecutionTime: 0,
            strategyBreakdown: {}
        };
        
        let totalExecutionTime = 0;
        let totalResolutions = 0;
        
        for (const [contradictionType, outcomes] of this.outcomeTracking) {
            metrics.strategyBreakdown[contradictionType] = {
                totalResolutions: outcomes.length,
                successes: outcomes.filter(o => o.success).length,
                failures: outcomes.filter(o => !o.success).length
            };
            
            // Calculate average execution time for this contradiction type
            const executionTimes = outcomes.map(o => o.executionTime);
            const avgTime = executionTimes.length > 0 ? 
                executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length : 0;
            
            metrics.strategyBreakdown[contradictionType].averageExecutionTime = avgTime;
            
            totalExecutionTime += executionTimes.reduce((sum, time) => sum + time, 0);
            totalResolutions += outcomes.length;
        }
        
        metrics.totalContradictions = totalResolutions;
        metrics.totalSuccesses = Array.from(this.outcomeTracking.values())
            .flat()
            .filter(o => o.success).length;
        metrics.totalFailures = Array.from(this.outcomeTracking.values())
            .flat()
            .filter(o => !o.success).length;
        metrics.successRate = totalResolutions > 0 ? metrics.totalSuccesses / totalResolutions : 0;
        metrics.averageExecutionTime = totalResolutions > 0 ? totalExecutionTime / totalResolutions : 0;
        
        return metrics;
    }
}

export default ResolutionStrategy;
