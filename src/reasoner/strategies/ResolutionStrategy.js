const Task = require('../../core/Task');
const { parseTerm } = require('../../parser/narseseParser');
const TruthValueManager = require('../TruthValueManager');

class ResolutionStrategy {
    constructor() {
        this.truthValueManager = new TruthValueManager();
    }

    resolve(contradiction, strategy) {
        const strategies = {
            revision: this._executeRevision,
            evidence_gathering: this._executeEvidenceGathering,
            reconciliation: this._executeReconciliation,
            external_validation: this._executeExternalValidation,
            temporal_analysis: this._executeTemporalAnalysis,
            contextual_reconciliation: this._executeContextualReconciliation,
            truth_value_revision: this._executeTruthValueRevision,
            causal_analysis: this._executeCausalAnalysis,
            hierarchical_reconciliation: this._executeHierarchicalReconciliation,
            monitoring: () => []
        };
        const selectedStrategy = strategy === 'auto' ? this._selectOptimalResolutionStrategy(contradiction) : strategy;
        const executor = strategies[selectedStrategy] || strategies.monitoring;
        return executor.call(this, contradiction);
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

    _executeRevision(contradiction) {
        const [task1, task2] = contradiction.tasks;
        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;

        if (c1 === c2) {
            [task1, task2].forEach(t => t.state.truthValue.confidence *= 0.1);
            return [task1, task2].map(t => this._createMetaTask('investigate_source', t.termKey, contradiction.confidence)).filter(Boolean);
        }

        const taskToRevise = c1 < c2 ? task1 : task2;
        taskToRevise.state.truthValue.confidence *= 0.1;
        return [this._createMetaTask('investigate_source', taskToRevise.termKey, contradiction.confidence)].filter(Boolean);
    }

    _executeEvidenceGathering(contradiction) {
        return contradiction.tasks.map(task => new Task(task.term, '?', {
            frequency: 1.0,
            confidence: 0.9
        }));
    }

    _executeReconciliation(contradiction) {
        const [task1, task2] = contradiction.tasks;
        const c1 = task1.state.truthValue.confidence,
            c2 = task2.state.truthValue.confidence;
        const f1 = task1.state.truthValue.frequency,
            f2 = task2.state.truthValue.frequency;
        const reconciledFrequency = (f1 * c1 + f2 * c2) / (c1 + c2);
        const reconciledConfidence = Math.min(c1, c2) * 0.8;
        const reconciledTask = new Task(task1.term, '.', {
            frequency: reconciledFrequency,
            confidence: reconciledConfidence
        });
        const metaTasks = [task1, task2].map(t => this._createMetaTask('investigate_source', t.termKey, contradiction.confidence)).filter(Boolean);
        return [reconciledTask, ...metaTasks];
    }

    _executeExternalValidation(contradiction) {
        return contradiction.tasks.map(task => this._createMetaTask('external_validation', task.termKey, contradiction.confidence)).filter(Boolean);
    }

    _executeTemporalAnalysis(contradiction) {
        return [this._createMetaTask('temporal_analysis', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
    }

    _executeContextualReconciliation(contradiction) {
        return [this._createMetaTask('contextual_reconciliation', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
    }

    _executeTruthValueRevision(contradiction) {
        const [task1, task2] = contradiction.tasks;
        const resolvedTruthValue = this.truthValueManager.resolveConflict(task1, task2);
        const resolutionTask = new Task(task1.term, '.', resolvedTruthValue);
        return [resolutionTask];
    }

    _executeCausalAnalysis(contradiction) {
        return [this._createMetaTask('causal_analysis', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
    }

    _executeHierarchicalReconciliation(contradiction) {
        return [this._createMetaTask('hierarchical_reconciliation', contradiction.tasks.map(t => t.termKey).join(','), contradiction.confidence)].filter(Boolean);
    }

    _createMetaTask(action, targetTermKey, confidence) {
        const metaTermKey = `(&, ${action}, ${targetTermKey})`;
        const parsedMetaTerm = parseTerm(metaTermKey);
        if (!parsedMetaTerm) return null;
        return new Task(parsedMetaTerm, '!', {
            frequency: 1.0,
            confidence
        });
    }
}

module.exports = ResolutionStrategy;
