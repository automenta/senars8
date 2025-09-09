const fs = require('fs');
const path = require('path');
const Task = require('../../core/Task');
const {parseTerm} = require('../../parser/narseseParser');
const TruthValueManager = require('../TruthValueManager');
const {createMetaTask} = require('./strategy-utils');

class ResolutionStrategy {
    constructor() {
        this.truthValueManager = new TruthValueManager();
        this.strategies = this._loadStrategies();
    }

    _loadStrategies() {
        const strategies = {};
        const strategyPath = path.join(__dirname, 'resolution');
        const files = fs.readdirSync(strategyPath);

        for (const file of files) {
            if (file.endsWith('.js')) {
                const strategyName = path.basename(file, '.js');
                strategies[strategyName] = require(path.join(strategyPath, file));
            }
        }
        return strategies;
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

module.exports = ResolutionStrategy;
