import fs from 'fs';
import path from 'path';
import Task from '../../core/Task.js';
import {parseTerm} from '../../parser/narseseParser.js';
import TruthValueManager from '../TruthValueManager.js';
import {createMetaTask} from './strategy-utils.js';
import causal_analysis from './resolution/causal_analysis.js';
import contextual_reconciliation from './resolution/contextual_reconciliation.js';
import evidence_gathering from './resolution/evidence_gathering.js';
import external_validation from './resolution/external_validation.js';
import hierarchical_reconciliation from './resolution/hierarchical_reconciliation.js';
import monitoring from './resolution/monitoring.js';
import reconciliation from './resolution/reconciliation.js';
import revision from './resolution/revision.js';
import temporal_analysis from './resolution/temporal_analysis.js';
import truth_value_revision from './resolution/truth_value_revision.js';

class ResolutionStrategy {
    constructor() {
        this.truthValueManager = new TruthValueManager();
        this.strategies = {
            causal_analysis,
            contextual_reconciliation,
            evidence_gathering,
            external_validation,
            hierarchical_reconciliation,
            monitoring,
            reconciliation,
            revision,
            temporal_analysis,
            truth_value_revision
        };
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
        if (contradiction.severity > 0.8) return 'revision';
        if (contradiction.severity > 0.6) return 'reconciliation';
        if (contradiction.tasks.some(t => t.state.stamp?.occurrenceTime)) return 'temporal_analysis';
        if (['inheritance_conflict', 'implication_conflict'].includes(contradiction.type)) return 'causal_analysis';
        if (contradiction.type === 'transitive_inheritance_conflict') return 'hierarchical_reconciliation';
        if (contradiction.severity > 0.4) return 'contextual_reconciliation';
        return 'evidence_gathering';
    }
}

export default ResolutionStrategy;
