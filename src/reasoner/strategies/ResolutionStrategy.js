import TruthValueManager from '../TruthValueManager.js';
import {resolutionStrategies} from './resolution/index.js';

class ResolutionStrategy {
    constructor() {
        this.truthValueManager = new TruthValueManager();
        this.strategies = resolutionStrategies;
    }

    resolve(contradiction, strategy) {
        const selectedStrategy = strategy === 'auto' ? this._selectOptimalResolutionStrategy(contradiction) : strategy;
        const executor = this.strategies[selectedStrategy] || this.strategies.monitoring;

        if (!executor) {
            return this.strategies.monitoring ? this.strategies.monitoring(contradiction, {}) : [];
        }

        const context = {
            truthValueManager: this.truthValueManager
        };

        return executor(contradiction, context);
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
