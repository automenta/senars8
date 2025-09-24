import {resolutionStrategies} from './resolution/index.js';

class ResolutionStrategy {
    constructor(truthValueManager) {
        this.truthValueManager = truthValueManager;
        this.strategies = resolutionStrategies;
    }

    resolve(contradiction, strategy) {
        const selectedStrategy = strategy === 'auto' ? this._selectOptimalResolutionStrategy(contradiction) : strategy;
        const executor = this.strategies[selectedStrategy] || this.strategies.monitoring;

        const context = {
            truthValueManager: this.truthValueManager
        };

        return executor(contradiction, context);
    }

    _selectOptimalResolutionStrategy(contradiction) {
        const strategyMapping = [
            { condition: c => c.severity > 0.8, strategy: 'revision' },
            { condition: c => c.severity > 0.6, strategy: 'reconciliation' },
            { condition: c => c.tasks.some(t => t.state.stamp?.occurrenceTime), strategy: 'temporal_analysis' },
            { condition: c => ['inheritance_conflict', 'implication_conflict'].includes(c.type), strategy: 'causal_analysis' },
            { condition: c => c.type === 'transitive_inheritance_conflict', strategy: 'hierarchical_reconciliation' },
            { condition: c => c.severity > 0.4, strategy: 'contextual_reconciliation' },
        ];

        for (const mapping of strategyMapping) {
            if (mapping.condition(contradiction)) {
                return mapping.strategy;
            }
        }

        return 'evidence_gathering';
    }
}

export default ResolutionStrategy;
