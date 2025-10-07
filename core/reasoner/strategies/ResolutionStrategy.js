import {resolutionStrategies} from './resolution/index.js';

class ResolutionStrategy {
    constructor(truthValueManager, metricsService = null) {
        this.truthValueManager = truthValueManager;
        this.metricsService = metricsService;
        this.strategies = resolutionStrategies;
    }

    resolve(contradiction, strategy) {
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
            
            return result;
        }

        const context = {
            truthValueManager: this.truthValueManager
        };

        try {
            const result = executor(contradiction, context);
            
            // Track resolution in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackContradictionResolution(
                    contradiction.type, 
                    selectedStrategy, 
                    result && result.length > 0, 
                    result && result.length > 0 ? 'success' : 'failure'
                );
            }
            
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
            
            // Return an empty array in case of error
            return [];
        }
    }

    _selectOptimalResolutionStrategy(contradiction) {
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
}

export default ResolutionStrategy;
