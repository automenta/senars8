const {
    parseTerm
} = require('../parser/narseseParser');
const Task = require('../core/Task');
const TruthValueManager = require('../reasoner/TruthValueManager');

class MetaCognition {
    constructor() {
        this.truthValueManager = new TruthValueManager();
    }

    findContradictions(tasks) {
        const beliefTasks = tasks.filter(task => task.punctuation === '.');
        const parsedBeliefs = beliefTasks.map(task => ({
            task,
            parsed: parseTerm(task.termKey)
        })).filter(item => item.parsed);

        const pairwiseContradictions = parsedBeliefs.flatMap((item1, i) =>
            parsedBeliefs.slice(i + 1).map(item2 => {
                const contradictionType = this.analyzeContradiction(item1.task, item2.task, item1.parsed, item2.parsed);
                if (!contradictionType) return null;
                return {
                    type: contradictionType.type,
                    tasks: [item1.task, item2.task],
                    confidence: Math.min(item1.task.state.truthValue.confidence, item2.task.state.truthValue.confidence),
                    details: contradictionType.details,
                    severity: this.calculateContradictionSeverity(contradictionType, item1.task, item2.task)
                };
            }).filter(Boolean)
        );

        // const transitiveContradictions = this.findTransitiveInheritanceContradictions(beliefTasks);
        return pairwiseContradictions; // Transitive is already handled by pairwise
    }

    calculateContradictionSeverity(contradictionType, task1, task2) {
        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;
        const typeWeight = CONTRADICTION_SEVERITY_WEIGHTS[contradictionType.type] || 0.5;
        return Math.min(1.0, typeWeight * (c1 + c2) / 2);
    }

    analyzeContradiction(task1, task2, parsed1, parsed2) {
        const analysisMethods = [
            this._analyzeDirectNegation, this._analyzeInheritanceConflict,
            this._analyzeImplicationConflict, this._analyzeEquivalenceConflict,
            this._analyzeSetConflict, this._analyzeConjunctionConflict,
            this._analyzeDisjunctionConflict, this._analyzeIntensionalSetConflict,
            this._analyzeGoalConflict, this._analyzeFrequencyConflict
        ];
        for (const method of analysisMethods) {
            const result = method.call(this, task1, task2, parsed1, parsed2);
            if (result) return result;
        }
        return null;
    }

    findTransitiveInheritanceContradictions(tasks) {
        const inheritanceTasks = tasks.filter(task => task.punctuation === '.' && task.term.type === 'Inheritance');
        const subjectToPredicates = new Map();

        for (const task of inheritanceTasks) {
            const subject = task.term.subject.key;
            if (!subjectToPredicates.has(subject)) {
                subjectToPredicates.set(subject, []);
            }
            const predicate = task.term.predicate;
            const predicateKey = predicate.type === 'Negation' ? predicate.term.key : predicate.key;
            subjectToPredicates.get(subject).push({
                predicate: predicateKey,
                task,
                isNegative: predicate.type === 'Negation'
            });
        }

        const contradictions = [];
        for (const [subject, predicates] of subjectToPredicates.entries()) {
            for (let i = 0; i < predicates.length; i++) {
                for (let j = i + 1; j < predicates.length; j++) {
                    const p1 = predicates[i];
                    const p2 = predicates[j];
                    if (p1.predicate === p2.predicate && p1.isNegative !== p2.isNegative) {
                        contradictions.push({
                            type: 'direct_inheritance_conflict',
                            tasks: [p1.task, p2.task],
                            confidence: Math.min(p1.task.state.truthValue.confidence, p2.task.state.truthValue.confidence),
                            details: `Subject "${subject}" has contradictory predicates for "${p1.predicate}"`
                        });
                    }
                }
            }
        }
        return contradictions;
    }

    _analyzeDirectNegation(task1, task2, parsed1, parsed2) {
        const check = (p1, p2, t1, t2) => {
            if (p1.type !== 'Negation') return null;
            const innerTermKey = p1.key.substring(p1.key.indexOf(',') + 1, p1.key.length - 1).trim();
            if (innerTermKey === t2.termKey) {
                return {
                    type: 'direct_negation',
                    details: `Direct negation: "${t1.termKey}" vs "${t2.termKey}"`
                };
            }
            return null;
        };
        return check(parsed1, parsed2, task1, task2) || check(parsed2, parsed1, task2, task1);
    }

    _analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, statementType) {
        if (parsed1.type !== statementType || parsed2.type !== statementType || parsed1.subject.key !== parsed2.subject.key) {
            return null;
        }
        const pred1 = parsed1.predicate;
        const pred2 = parsed2.predicate;
        const check = (p1, p2) => p1.type === 'Negation' && p1.term.key === p2.key;
        if (check(pred1, pred2) || check(pred2, pred1)) {
            return {
                type: `${statementType.toLowerCase()}_conflict`,
                details: `${statementType} conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }
        return null;
    }

    _analyzeInheritanceConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, 'Inheritance');
    }

    _analyzeImplicationConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, 'Implication');
    }

    _analyzeEquivalenceConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, 'Equivalence');
    }

    _analyzeSetConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'ExtensionalSet' || parsed2.type !== 'ExtensionalSet') return null;
        const terms1 = new Set((parsed1.terms || []).map(t => t.key));
        const terms2 = (parsed2.terms || []).map(t => t.key);

        for (const termKey of terms2) {
            if (terms1.has(`(--,${termKey})`)) {
                return {
                    type: 'set_conflict',
                    details: `Set conflict on element ${termKey}`
                };
            }
        }
        return null;
    }

    _analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, expectedType, conflictType) {
        if (parsed1.type !== expectedType || parsed2.type !== expectedType) return null;
        const terms1 = new Map((parsed1.terms || []).map(t => [t.key.replace('--', ''), t]));
        const terms2 = new Map((parsed2.terms || []).map(t => [t.key.replace('--', ''), t]));

        for (const [key, term1] of terms1.entries()) {
            const term2 = terms2.get(key);
            if (term2 && term1.type !== term2.type) {
                return {
                    type: conflictType,
                    details: `${expectedType} conflict on element ${key}`
                };
            }
        }
        return null;
    }

    _analyzeConjunctionConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, 'Conjunction', 'conjunction_conflict');
    }

    _analyzeDisjunctionConflict(task1, task2, parsed1, parsed2) {
        return this._analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, 'Disjunction', 'disjunction_conflict');
    }

    _analyzeIntensionalSetConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'IntensionalSet' || parsed2.type !== 'IntensionalSet') return null;
        const terms1 = new Set((parsed1.terms || []).map(t => t.key));
        const terms2 = (parsed2.terms || []).map(t => t.key);

        for (const termKey of terms2) {
            if (terms1.has(`(--,${termKey})`)) {
                return {
                    type: 'intensional_set_conflict',
                    details: `Intensional set conflict on element ${termKey}`
                };
            }
        }
        return null;
    }


    _analyzeFrequencyConflict(task1, task2) {
        const freqConflict = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8;
        const highConfidence = task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8;
        if (freqConflict && highConfidence) {
            return {
                type: 'frequency_conflict',
                details: `High confidence frequency conflict for "${task1.termKey}"`
            };
        }
        return null;
    }

    _analyzeGoalConflict(task1, task2, parsed1, parsed2) {
        if (task1.punctuation !== '!' || task2.punctuation !== '!') return null;
        return this._analyzeDirectNegation(task1, task2, parsed1, parsed2) ? {
            type: 'goal_conflict',
            details: `Direct goal conflict: "${task1.termKey}" vs "${task2.termKey}"`
        } : null;
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

    generateContradictionReport(contradictions) {
        if (contradictions.length === 0) return "No contradictions found.";
        return `Contradiction Report (${contradictions.length} found):\n` +
            contradictions.map((c, i) =>
                `${i+1}. Type: ${c.type}\n` +
                `   Confidence: ${c.confidence.toFixed(3)}\n` +
                `   Severity: ${c.severity.toFixed(3)}\n` +
                `   Details: ${c.details}\n` +
                `   Tasks:\n` +
                c.tasks.map(t => `     - ${t.termKey}${t.punctuation} (f: ${t.state.truthValue.frequency.toFixed(3)}, c: ${t.state.truthValue.confidence.toFixed(3)})`).join('\n')
            ).join('\n\n');
    }
}

const CONTRADICTION_SEVERITY_WEIGHTS = {
    direct_negation: 1.0,
    inheritance_conflict: 0.8,
    implication_conflict: 0.8,
    transitive_inheritance_conflict: 0.7,
    equivalence_conflict: 0.7,
    set_conflict: 0.7,
    conjunction_conflict: 0.65,
    disjunction_conflict: 0.65,
    intensional_set_conflict: 0.65,
    variable_conflict: 0.6,
    temporal_conflict: 0.6,
    goal_conflict: 0.6,
    frequency_conflict: 0.55
};

module.exports = MetaCognition;