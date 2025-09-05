const {
    parseTerm
} = require('../parser/NewParser');
const Task = require('../core/Task');
const TruthValueManager = require('../reasoner/TruthValueManager');

class MetaCognition {
    constructor() {
        this.truthValueManager = new TruthValueManager();
    }
    
    findContradictions(tasks) {
        const contradictions = [];
        const beliefTasks = tasks.filter(task => task.punctuation === '.');

        // Pairwise contradiction detection
        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];

                // Pre-parse terms to avoid redundant parsing in analysis functions
                const parsed1 = parseTerm(task1.termKey);
                const parsed2 = parseTerm(task2.termKey);
                if (!parsed1 || !parsed2) continue;

                const contradictionType = this.analyzeContradiction(task1, task2, parsed1, parsed2);
                if (contradictionType) {
                    contradictions.push({
                        type: contradictionType.type,
                        tasks: [task1, task2],
                        confidence: Math.min(task1.state.truthValue.confidence, task2.state.truthValue.confidence),
                        details: contradictionType.details,
                        severity: this.calculateContradictionSeverity(contradictionType, task1, task2)
                    });
                }
            }
        }

        // Transitive inheritance contradiction detection
        const transitiveContradictions = this.findTransitiveInheritanceContradictions(beliefTasks);
        contradictions.push(...transitiveContradictions);

        return contradictions;
    }

    calculateContradictionSeverity(contradictionType, task1, task2) {
        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;

        let typeWeight = 1.0;
        switch (contradictionType.type) {
            case 'direct_negation':
                typeWeight = 1.0;
                break;
            case 'inheritance_conflict':
            case 'implication_conflict':
                typeWeight = 0.8;
                break;
            case 'transitive_inheritance_conflict':
            case 'equivalence_conflict':
            case 'set_conflict':
                typeWeight = 0.7;
                break;
            case 'conjunction_conflict':
            case 'disjunction_conflict':
            case 'intensional_set_conflict':
                typeWeight = 0.65;
                break;
            case 'variable_conflict':
            case 'temporal_conflict':
            case 'goal_conflict':
                typeWeight = 0.6;
                break;
            case 'frequency_conflict':
                typeWeight = 0.55;
                break;
            default:
                typeWeight = 0.5;
        }

        // Severity is the average confidence, weighted by the type of conflict.
        const severity = typeWeight * (c1 + c2) / 2;
        return Math.min(1.0, severity);
    }

    /**
     * Analyzes two tasks to find a contradiction.
     * Delegates to specific analysis methods based on term structure.
     * @param {Task} task1 - The first task.
     * @param {Task} task2 - The second task.
     * @param {object} parsed1 - The parsed term from task1.
     * @param {object} parsed2 - The parsed term from task2.
     * @returns {object|null} A contradiction object or null.
     */
    analyzeContradiction(task1, task2, parsed1, parsed2) {
        return (
            this._analyzeDirectNegation(task1, task2, parsed1, parsed2) ||
            this._analyzeInheritanceConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeImplicationConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeEquivalenceConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeSetConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeConjunctionConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeDisjunctionConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeIntensionalSetConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeVariableConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeTemporalConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeGoalConflict(task1, task2, parsed1, parsed2) ||
            this._analyzeFrequencyConflict(task1, task2) // Check frequency last as it's less specific
        );
    }

    /**
     * Analyzes a set of tasks to find transitive inheritance contradictions.
     * @param {Task[]} tasks - Array of tasks to analyze.
     * @returns {object|null} A contradiction object or null.
     */
    findTransitiveInheritanceContradictions(tasks) {
        const contradictions = [];
        const inheritanceTasks = tasks.filter(task => task.punctuation === '.' && task.term.type === 'Inheritance');
        
        // Create maps for easier lookup
        const subjectToPredicates = new Map(); // subject -> [predicates]
        
        // Populate the maps
        for (const task of inheritanceTasks) {
            const subject = task.term.subject.key;
            const predicate = task.term.predicate;
            
            if (!subjectToPredicates.has(subject)) {
                subjectToPredicates.set(subject, []);
            }
            
            // Handle both atomic predicates and negated predicates
            const predicateKey = predicate.type === 'Negation' ? predicate.term.key : predicate.key;
            subjectToPredicates.get(subject).push({ 
                predicate: predicateKey, 
                task, 
                isNegative: predicate.type === 'Negation' 
            });
        }
        
        // Look for direct contradictions (same subject, contradictory predicates)
        for (const [subject, predicates] of subjectToPredicates.entries()) {
            for (let i = 0; i < predicates.length; i++) {
                for (let j = i + 1; j < predicates.length; j++) {
                    const pred1 = predicates[i];
                    const pred2 = predicates[j];
                    
                    // Check for direct contradiction
                    if (pred1.predicate === pred2.predicate && pred1.isNegative !== pred2.isNegative) {
                        contradictions.push({
                            type: 'direct_inheritance_conflict',
                            tasks: [pred1.task, pred2.task],
                            confidence: Math.min(pred1.task.state.truthValue.confidence, pred2.task.state.truthValue.confidence),
                            details: `Same subject "${subject}" has contradictory predicates: "${pred1.predicate}" and "${pred2.predicate}"`
                        });
                    }
                }
            }
        }
        
        // Look for transitive contradictions (A->B, B->C, A->(--,C))
        for (const [subject1, predicates1] of subjectToPredicates.entries()) {
            for (const pred1 of predicates1) {
                // Only consider positive inheritance relationships for transitivity
                if (!pred1.isNegative) {
                    const intermediate = pred1.predicate;
                    // Check if this intermediate is a subject in other relationships
                    if (subjectToPredicates.has(intermediate)) {
                        const predicates2 = subjectToPredicates.get(intermediate);
                        for (const pred2 of predicates2) {
                            // Now we have subject1 -> intermediate -> predicate2
                            // Check if subject1 has a direct relationship to predicate2 that contradicts this
                            const subject1Predicates = subjectToPredicates.get(subject1) || [];
                            for (const directPred of subject1Predicates) {
                                if (directPred.isNegative && directPred.predicate === pred2.predicate) {
                                    const confidence = Math.min(
                                pred1.task.state.truthValue.confidence,
                                pred2.task.state.truthValue.confidence,
                                directPred.task.state.truthValue.confidence
                            );
                            contradictions.push({
                                type: 'transitive_inheritance_conflict',
                                tasks: [pred1.task, pred2.task, directPred.task],
                                confidence: confidence,
                                details: `Transitive contradiction: "${subject1}" -> "${intermediate}" -> "${pred2.predicate}" vs direct "${subject1}" -> "(--, ${directPred.predicate})"`,
                                severity: this.calculateContradictionSeverity({type: 'transitive_inheritance_conflict'}, pred1.task, pred2.task)
                            });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return contradictions;
    }

    _analyzeDirectNegation(task1, task2, parsed1, parsed2) {
        if (parsed1.type === 'Negation') {
            // HACK: The parser does not provide the key for nested terms.
            // This manually extracts the inner term's string. A proper parser fix is needed.
            const key = parsed1.key;
            const firstComma = key.indexOf(',');
            if (firstComma !== -1) {
                const innerTermKey = key.substring(firstComma + 1, key.length - 1).trim();
                if (innerTermKey === task2.termKey) {
                    return {
                        type: 'direct_negation',
                        details: `Direct negation between "${task2.termKey}" and "${task1.termKey}"`
                    };
                }
            }
        }
        if (parsed2.type === 'Negation') {
            // HACK: See above.
            const key = parsed2.key;
            const firstComma = key.indexOf(',');
            if (firstComma !== -1) {
                const innerTermKey = key.substring(firstComma + 1, key.length - 1).trim();
                if (innerTermKey === task1.termKey) {
                    return {
                        type: 'direct_negation',
                        details: `Direct negation between "${task1.termKey}" and "${task2.termKey}"`
                    };
                }
            }
        }
        return null;
    }

    _analyzeInheritanceConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'Inheritance' || parsed2.type !== 'Inheritance') {
            return null;
        }

        // The predicate of an Inheritance term is a parsed term object.
        // e.g., for (S --> P), predicate is the parsed object for P.
        const pred1 = parsed1.predicate;
        const pred2 = parsed2.predicate;
        const subj1 = parsed1.subject;
        const subj2 = parsed2.subject;

        // Check if subjects are the same and predicates are contradictory
        if (subj1.key === subj2.key) {
            // Check if one predicate is the negation of the other
            if (pred1.type === 'Negation' && pred1.term.key === pred2.key) {
                return {
                    type: 'inheritance_conflict',
                    details: `Inheritance conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }

            if (pred2.type === 'Negation' && pred2.term.key === pred1.key) {
                return {
                    type: 'inheritance_conflict',
                    details: `Inheritance conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
        }

        // Check for transitive inheritance contradictions
        // e.g., (A --> B), (B --> C), (A --> (--,C))
        if (subj1.key === subj2.key) {
            // Same subject, different predicates - already handled above
        } else if (pred1.key === subj2.key) {
            // task1: (A --> B), task2: (B --> C)
            // Check if there's a third task (A --> (--,C))
        } else if (pred2.key === subj1.key) {
            // task2: (A --> B), task1: (B --> C)
            // Check if there's a third task (A --> (--,C))
        }

        return null;
    }

    _analyzeImplicationConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'Implication' || parsed2.type !== 'Implication' || parsed1.subject.key !== parsed2.subject.key) {
            return null;
        }

        const pred1 = parsed1.predicate;
        const pred2 = parsed2.predicate;

        if (pred1.type === 'Negation' && pred1.term.key === pred2.key) {
            return {
                type: 'implication_conflict',
                details: `Implication conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }

        if (pred2.type === 'Negation' && pred2.term.key === pred1.key) {
            return {
                type: 'implication_conflict',
                details: `Implication conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }
        return null;
    }

    _analyzeEquivalenceConflict(task1, task2, parsed1, parsed2) {
        if (parsed1.type !== 'Equivalence' || parsed2.type !== 'Equivalence') {
            return null;
        }

        // Check if one equivalence contradicts the other
        const subject1 = parsed1.subject;
        const predicate1 = parsed1.predicate;
        const subject2 = parsed2.subject;
        const predicate2 = parsed2.predicate;

        // Check if (A <=> B) conflicts with (A <=> (--,B))
        if (subject1.key === subject2.key && predicate1.type === 'Negation' && predicate1.term.key === predicate2.key) {
            return {
                type: 'equivalence_conflict',
                details: `Equivalence conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }

        if (subject1.key === subject2.key && predicate2.type === 'Negation' && predicate2.term.key === predicate1.key) {
            return {
                type: 'equivalence_conflict',
                details: `Equivalence conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }

        return null;
    }

    _analyzeSetConflict(task1, task2, parsed1, parsed2) {
        // Check for conflicts in set definitions
        if (parsed1.type !== 'ExtensionalSet' || parsed2.type !== 'ExtensionalSet') {
            return null;
        }

        // Check if sets have contradictory elements
        const terms1 = parsed1.terms || [];
        const terms2 = parsed2.terms || [];

        // Simple check: if one set contains an element and its negation is in another set
        for (const term1 of terms1) {
            if (term1.type === 'Negation') {
                const negatedKey = term1.term.key;
                for (const term2 of terms2) {
                    if (term2.key === negatedKey) {
                        return {
                            type: 'set_conflict',
                            details: `Set conflict: "${task1.termKey}" vs "${task2.termKey}"`
                        };
                    }
                }
            }
        }

        for (const term2 of terms2) {
            if (term2.type === 'Negation') {
                const negatedKey = term2.term.key;
                for (const term1 of terms1) {
                    if (term1.key === negatedKey) {
                        return {
                            type: 'set_conflict',
                            details: `Set conflict: "${task1.termKey}" vs "${task2.termKey}"`
                        };
                    }
                }
            }
        }

        return null;
    }

    _analyzeConjunctionConflict(task1, task2, parsed1, parsed2) {
        // Check for conflicts in conjunctions
        if (parsed1.type !== 'Conjunction' || parsed2.type !== 'Conjunction') {
            return null;
        }

        // Check if one conjunction contains a term and the other contains its negation
        const terms1 = parsed1.terms || [];
        const terms2 = parsed2.terms || [];

        // Create a map of terms for faster lookup
        const termMap1 = new Map();
        const termMap2 = new Map();

        for (const term of terms1) {
            if (term.type === 'Atomic') {
                termMap1.set(term.key, term);
            } else if (term.type === 'Negation') {
                termMap1.set(`--${term.term.key}`, term);
            }
        }

        for (const term of terms2) {
            if (term.type === 'Atomic') {
                termMap2.set(term.key, term);
            } else if (term.type === 'Negation') {
                termMap2.set(`--${term.term.key}`, term);
            }
        }

        // Check for direct conflicts
        for (const [key, term] of termMap1) {
            // If term1 is positive (A) and we find (--A) in termMap2
            if (!key.startsWith('--') && termMap2.has(`--${key}`)) {
                return {
                    type: 'conjunction_conflict',
                    details: `Conjunction conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
            // If term1 is negative (--A) and we find (A) in termMap2
            if (key.startsWith('--') && termMap2.has(key.substring(2))) {
                return {
                    type: 'conjunction_conflict',
                    details: `Conjunction conflict: "${task1.termKey}" vs "${task2.termKey}"`
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
                details: `High confidence frequency conflict between "${task1.termKey}" (${task1.state.truthValue.frequency}) and "${task2.termKey}" (${task2.state.truthValue.frequency})`
            };
        }
        return null;
    }

    /**
     * Analyzes disjunction conflicts between tasks
     * @param {Task} task1 - The first task.
     * @param {Task} task2 - The second task.
     * @param {object} parsed1 - The parsed term from task1.
     * @param {object} parsed2 - The parsed term from task2.
     * @returns {object|null} A contradiction object or null.
     */
    _analyzeDisjunctionConflict(task1, task2, parsed1, parsed2) {
        // Check for conflicts in disjunctions
        if (parsed1.type !== 'Disjunction' || parsed2.type !== 'Disjunction') {
            return null;
        }

        // Check if one disjunction contains a term and the other contains its negation
        const terms1 = parsed1.terms || [];
        const terms2 = parsed2.terms || [];

        // Create a map of terms for faster lookup
        const termMap1 = new Map();
        const termMap2 = new Map();

        for (const term of terms1) {
            if (term.type === 'Atomic') {
                termMap1.set(term.key, term);
            } else if (term.type === 'Negation') {
                termMap1.set(`--${term.term.key}`, term);
            }
        }

        for (const term of terms2) {
            if (term.type === 'Atomic') {
                termMap2.set(term.key, term);
            } else if (term.type === 'Negation') {
                termMap2.set(`--${term.term.key}`, term);
            }
        }

        // Check for direct conflicts
        for (const [key, term] of termMap1) {
            // If term1 is positive (A) and we find (--A) in termMap2
            if (!key.startsWith('--') && termMap2.has(`--${key}`)) {
                return {
                    type: 'disjunction_conflict',
                    details: `Disjunction conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
            // If term1 is negative (--A) and we find (A) in termMap2
            if (key.startsWith('--') && termMap2.has(key.substring(2))) {
                return {
                    type: 'disjunction_conflict',
                    details: `Disjunction conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
        }

        return null;
    }

    /**
     * Analyzes intensional set conflicts between tasks
     * @param {Task} task1 - The first task.
     * @param {Task} task2 - The second task.
     * @param {object} parsed1 - The parsed term from task1.
     * @param {object} parsed2 - The parsed term from task2.
     * @returns {object|null} A contradiction object or null.
     */
    _analyzeIntensionalSetConflict(task1, task2, parsed1, parsed2) {
        // Check for conflicts in intensional sets (properties)
        if (parsed1.type !== 'IntensionalSet' || parsed2.type !== 'IntensionalSet') {
            return null;
        }

        // Check if sets have contradictory properties
        const terms1 = parsed1.terms || [];
        const terms2 = parsed2.terms || [];

        // Simple check: if one set contains a property and its negation is in another set
        for (const term1 of terms1) {
            if (term1.type === 'Negation') {
                const negatedKey = term1.term.key;
                for (const term2 of terms2) {
                    if (term2.key === negatedKey) {
                        return {
                            type: 'intensional_set_conflict',
                            details: `Intensional set conflict: "${task1.termKey}" vs "${task2.termKey}"`
                        };
                    }
                }
            }
        }

        for (const term2 of terms2) {
            if (term2.type === 'Negation') {
                const negatedKey = term2.term.key;
                for (const term1 of terms1) {
                    if (term1.key === negatedKey) {
                        return {
                            type: 'intensional_set_conflict',
                            details: `Intensional set conflict: "${task1.termKey}" vs "${task2.termKey}"`
                        };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Analyzes variable conflicts between tasks
     * @param {Task} task1 - The first task.
     * @param {Task} task2 - The second task.
     * @param {object} parsed1 - The parsed term from task1.
     * @param {object} parsed2 - The parsed term from task2.
     * @returns {object|null} A contradiction object or null.
     */
    _analyzeVariableConflict(task1, task2, parsed1, parsed2) {
        // Check for conflicts with variables
        if (parsed1.type !== 'StatementWithVariables' || parsed2.type !== 'StatementWithVariables') {
            return null;
        }

        // Check if the statements are the same but with contradictory truth values
        if (parsed1.statement === parsed2.statement) {
            // If both are beliefs with high confidence but contradictory frequencies
            if (task1.punctuation === '.' && task2.punctuation === '.' &&
                task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8 &&
                Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8) {
                return {
                    type: 'variable_conflict',
                    details: `Variable conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
        }

        return null;
    }

    /**
     * Analyzes temporal conflicts between tasks
     * @param {Task} task1 - The first task.
     * @param {Task} task2 - The second task.
     * @param {object} parsed1 - The parsed term from task1.
     * @param {object} parsed2 - The parsed term from task2.
     * @returns {object|null} A contradiction object or null.
     */
    _analyzeTemporalConflict(task1, task2, parsed1, parsed2) {
        // Check for temporal conflicts
        if (!task1.state.stamp || !task1.state.stamp.occurrenceTime ||
            !task2.state.stamp || !task2.state.stamp.occurrenceTime) {
            return null;
        }

        // If tasks refer to the same event at different times with contradictory properties
        if (parsed1.type === 'Event' && parsed2.type === 'Event' &&
            parsed1.event === parsed2.event &&
            task1.state.stamp.occurrenceTime !== task2.state.stamp.occurrenceTime) {
            // Check if they have contradictory truth values
            if (task1.punctuation === '.' && task2.punctuation === '.' &&
                task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8 &&
                Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8) {
                return {
                    type: 'temporal_conflict',
                    details: `Temporal conflict: "${task1.termKey}" at time ${task1.state.stamp.occurrenceTime} vs "${task2.termKey}" at time ${task2.state.stamp.occurrenceTime}`
                };
            }
        }

        return null;
    }

    /**
     * Analyzes goal conflicts between tasks
     * @param {Task} task1 - The first task.
     * @param {Task} task2 - The second task.
     * @param {object} parsed1 - The parsed term from task1.
     * @param {object} parsed2 - The parsed term from task2.
     * @returns {object|null} A contradiction object or null.
     */
    _analyzeGoalConflict(task1, task2, parsed1, parsed2) {
        // Check for conflicting goals
        if (task1.punctuation !== '!' || task2.punctuation !== '!') {
            return null;
        }

        // Check for directly contradictory goals
        if (parsed1.type === 'Negation' && parsed1.term.key === task2.termKey) {
            return {
                type: 'goal_conflict',
                details: `Direct goal conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }

        if (parsed2.type === 'Negation' && parsed2.term.key === task1.termKey) {
            return {
                type: 'goal_conflict',
                details: `Direct goal conflict: "${task1.termKey}" vs "${task2.termKey}"`
            };
        }

        return null;
    }


    /**
     * Resolves a contradiction based on a defined strategy.
     * @param {object} contradiction - The contradiction object.
     * @param {string} strategy - The resolution strategy ('revision', 'evidence_gathering', 'monitoring', 'reconciliation', 'external_validation', 'temporal_analysis', 'contextual_reconciliation', 'truth_value_revision', 'causal_analysis', 'hierarchical_reconciliation', 'auto').
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    resolve(contradiction, strategy) {
        // If auto strategy, select the most appropriate strategy based on contradiction characteristics
        if (strategy === 'auto') {
            strategy = this._selectOptimalResolutionStrategy(contradiction);
        }
        
        switch (strategy) {
            case 'revision':
                return this._executeRevision(contradiction);
            case 'evidence_gathering':
                return this._executeEvidenceGathering(contradiction);
            case 'reconciliation':
                return this._executeReconciliation(contradiction);
            case 'external_validation':
                return this._executeExternalValidation(contradiction);
            case 'temporal_analysis':
                return this._executeTemporalAnalysis(contradiction);
            case 'contextual_reconciliation':
                return this._executeContextualReconciliation(contradiction);
            case 'truth_value_revision':
                return this._executeTruthValueRevision(contradiction);
            case 'causal_analysis':
                return this._executeCausalAnalysis(contradiction);
            case 'hierarchical_reconciliation':
                return this._executeHierarchicalReconciliation(contradiction);
            case 'monitoring':
            default:
                return []; // Monitoring means do nothing for now.
        }
    }

    /**
     * Selects the optimal resolution strategy based on contradiction characteristics
     * @param {object} contradiction - The contradiction object.
     * @returns {string} The recommended resolution strategy.
     */
    _selectOptimalResolutionStrategy(contradiction) {
        // High severity contradictions should be revised
        if (contradiction.severity > 0.8) {
            return 'revision';
        }
        
        // Medium-high severity contradictions might benefit from reconciliation
        if (contradiction.severity > 0.6) {
            return 'reconciliation';
        }
        
        // Contradictions with temporal information should be analyzed temporally
        const hasTemporalInfo = contradiction.tasks.some(task => 
            task.state.stamp && task.state.stamp.occurrenceTime);
        if (hasTemporalInfo) {
            return 'temporal_analysis';
        }
        
        // Contradictions with causal relationships should be analyzed causally
        if (contradiction.type === 'inheritance_conflict' || contradiction.type === 'implication_conflict') {
            return 'causal_analysis';
        }
        
        // High confidence contradictions with significant frequency differences 
        // should use truth value revision
        const highConfidence = contradiction.tasks.every(task => 
            task.state.truthValue.confidence > 0.8);
        const frequencyDifference = contradiction.tasks.length > 1 ? 
            Math.abs(contradiction.tasks[0].state.truthValue.frequency - 
                    contradiction.tasks[1].state.truthValue.frequency) : 0;
            
        if (highConfidence && frequencyDifference > 0.6) {
            return 'truth_value_revision';
        }
        
        // Contradictions with moderate severity and contextual potential
        if (contradiction.severity > 0.4) {
            // For hierarchical contradictions, use hierarchical reconciliation
            if (contradiction.type === 'transitive_inheritance_conflict') {
                return 'hierarchical_reconciliation';
            }
            return 'contextual_reconciliation';
        }
        
        // Low severity contradictions can be monitored
        if (contradiction.severity > 0.2) {
            return 'monitoring';
        }
        
        // Very low severity contradictions should gather evidence
        return 'evidence_gathering';
    }

    _executeRevision(contradiction) {
        const [task1, task2] = contradiction.tasks;
        const newTasks = [];

        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;

        let taskToRevise;
        if (c1 < c2) {
            taskToRevise = task1;
        } else if (c2 < c1) {
            taskToRevise = task2;
        } else {
            // If confidences are equal, revise both
            task1.state.truthValue.confidence *= 0.1;
            task2.state.truthValue.confidence *= 0.1;
            const metaTask1 = this._createMetaTask('investigate_source', task1.termKey, contradiction.confidence);
            const metaTask2 = this._createMetaTask('investigate_source', task2.termKey, contradiction.confidence);
            if (metaTask1) newTasks.push(metaTask1);
            if (metaTask2) newTasks.push(metaTask2);
            return newTasks;
        }

        // Revise the weaker task
        taskToRevise.state.truthValue.confidence *= 0.1;

        // Create a meta-task to investigate the source of the revised belief
        const metaTask = this._createMetaTask('investigate_source', taskToRevise.termKey, contradiction.confidence);
        if (metaTask) {
            newTasks.push(metaTask);
        }

        return newTasks;
    }

    _executeEvidenceGathering(contradiction) {
        const newTasks = [];
        for (const task of contradiction.tasks) {
            // Create a question task to re-evaluate the belief
            const questionTask = new Task(
                task.term, // Use the parsed term object from the existing task
                '?', {
                    frequency: 1.0,
                    confidence: 0.9
                } // High priority question
            );
            newTasks.push(questionTask);
        }
        return newTasks;
    }

    _executeReconciliation(contradiction) {
        const [task1, task2] = contradiction.tasks;
        const newTasks = [];

        // Try to find a middle ground by creating a new task that combines both beliefs
        const c1 = task1.state.truthValue.confidence;
        const c2 = task2.state.truthValue.confidence;
        const f1 = task1.state.truthValue.frequency;
        const f2 = task2.state.truthValue.frequency;

        // Weighted average of frequencies based on confidences
        const reconciledFrequency = (f1 * c1 + f2 * c2) / (c1 + c2);
        // Reduced confidence for the reconciled belief
        const reconciledConfidence = Math.min(c1, c2) * 0.8;

        // Create a new reconciled task
        const reconciledTask = new Task(
            task1.term, // Use the term from the first task
            '.', {
                frequency: reconciledFrequency,
                confidence: reconciledConfidence
            }
        );
        newTasks.push(reconciledTask);

        // Create meta-tasks to investigate the source of both beliefs
        const metaTask1 = this._createMetaTask('investigate_source', task1.termKey, contradiction.confidence);
        const metaTask2 = this._createMetaTask('investigate_source', task2.termKey, contradiction.confidence);
        if (metaTask1) newTasks.push(metaTask1);
        if (metaTask2) newTasks.push(metaTask2);

        return newTasks;
    }

    _executeExternalValidation(contradiction) {
        const newTasks = [];
        
        // Create tasks to seek external validation for each contradictory belief
        for (const task of contradiction.tasks) {
            // Create a goal to seek external validation
            const validationGoal = new Task(
                task.term,
                '!', {
                    frequency: 1.0,
                    confidence: contradiction.confidence
                }
            );
            newTasks.push(validationGoal);
        }
        
        // Create a meta-task to synthesize findings after validation
        const synthesisTask = this._createMetaTask('synthesize_validation_results', 'contradiction_resolution', contradiction.confidence);
        if (synthesisTask) {
            newTasks.push(synthesisTask);
        }
        
        return newTasks;
    }

    /**
     * Analyze contradictions in the context of temporal information
     * @param {object} contradiction - The contradiction object.
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    _executeTemporalAnalysis(contradiction) {
        const newTasks = [];
        
        // Check if tasks have temporal information
        const temporalTasks = contradiction.tasks.filter(task => task.state.stamp && task.state.stamp.occurrenceTime);
        
        if (temporalTasks.length > 0) {
            // Create a task to analyze temporal patterns
            const temporalAnalysisTermKey = `(&, temporal_analysis, ${contradiction.tasks[0].termKey}, ${contradiction.tasks[1].termKey})`;
            const parsedTerm = parseTerm(temporalAnalysisTermKey);
            
            if (parsedTerm) {
                const temporalAnalysisTask = new Task(
                    parsedTerm,
                    '!', {
                        frequency: 1.0,
                        confidence: contradiction.confidence
                    }
                );
                newTasks.push(temporalAnalysisTask);
            }
            
            // Create tasks to investigate temporal context for each belief
            for (const task of contradiction.tasks) {
                const contextInvestigationTermKey = `(&, investigate_temporal_context, ${task.termKey})`;
                const parsedContextTerm = parseTerm(contextInvestigationTermKey);
                
                if (parsedContextTerm) {
                    const contextTask = new Task(
                        parsedContextTerm,
                        '!', {
                            frequency: 1.0,
                            confidence: contradiction.confidence * 0.8
                        }
                    );
                    newTasks.push(contextTask);
                }
            }
        } else {
            // If no temporal information, fall back to evidence gathering
            return this._executeEvidenceGathering(contradiction);
        }
        
        return newTasks;
    }

    /**
     * Resolve contradictions by considering contextual factors
     * @param {object} contradiction - The contradiction object.
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    _executeContextualReconciliation(contradiction) {
        const newTasks = [];
        
        // Create a contextual reconciliation task
        const contextReconciliationTermKey = `(&, contextual_reconciliation, ${contradiction.tasks[0].termKey}, ${contradiction.tasks[1].termKey})`;
        const parsedTerm = parseTerm(contextReconciliationTermKey);
        
        if (parsedTerm) {
            // Calculate contextual confidence based on contradiction severity
            const contextualConfidence = Math.max(0.3, contradiction.severity * 0.7);
            
            const reconciliationTask = new Task(
                parsedTerm,
                '!', {
                    frequency: 0.8, // Lower frequency as this is a meta-task
                    confidence: contextualConfidence
                }
            );
            newTasks.push(reconciliationTask);
        }
        
        // Create tasks to identify contextual factors
        for (const task of contradiction.tasks) {
            const contextIdentificationTermKey = `(&, identify_context, ${task.termKey})`;
            const parsedContextTerm = parseTerm(contextIdentificationTermKey);
            
            if (parsedContextTerm) {
                const contextTask = new Task(
                    parsedContextTerm,
                    '!', {
                        frequency: 0.9,
                        confidence: contradiction.confidence * 0.7
                    }
                );
                newTasks.push(contextTask);
            }
        }
        
        return newTasks;
    }

    /**
     * Resolves contradictions through advanced truth value revision.
     * @param {object} contradiction - The contradiction object.
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    _executeTruthValueRevision(contradiction) {
        const newTasks = [];
        
        // Use the TruthValueManager to resolve the contradiction
        if (contradiction.tasks.length >= 2) {
            const task1 = contradiction.tasks[0];
            const task2 = contradiction.tasks[1];
            
            // Resolve the conflict using the TruthValueManager
            const resolvedTruthValue = this.truthValueManager.resolveConflict(task1, task2);
            
            // Create a meta-task to record the resolution
            const resolutionTermKey = `(&, resolved_conflict, ${task1.termKey}, ${task2.termKey})`;
            const parsedTerm = parseTerm(resolutionTermKey);
            
            if (parsedTerm) {
                const resolutionTask = new Task(
                    parsedTerm,
                    '.',
                    {
                        frequency: resolvedTruthValue.frequency,
                        confidence: resolvedTruthValue.confidence * 0.8 // Slightly lower confidence for meta-knowledge
                    }
                );
                newTasks.push(resolutionTask);
            }
            
            // Create tasks to gather more evidence about the resolved belief
            for (const task of contradiction.tasks) {
                const evidenceTask = new Task(
                    task.term,
                    '?',
                    {
                        frequency: resolvedTruthValue.frequency,
                        confidence: 0.7
                    }
                );
                newTasks.push(evidenceTask);
            }
        }
        
        return newTasks;
    }

    /**
     * Resolves contradictions through causal analysis.
     * @param {object} contradiction - The contradiction object.
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    _executeCausalAnalysis(contradiction) {
        const newTasks = [];
        
        // Create tasks to investigate the causal relationships
        for (const task of contradiction.tasks) {
            const causalAnalysisTermKey = `(&, causal_analysis, ${task.termKey})`;
            const parsedTerm = parseTerm(causalAnalysisTermKey);
            
            if (parsedTerm) {
                const analysisTask = new Task(
                    parsedTerm,
                    '!',
                    {
                        frequency: 1.0,
                        confidence: contradiction.confidence * 0.8
                    }
                );
                newTasks.push(analysisTask);
            }
        }
        
        // Create a meta-task to synthesize causal findings
        const synthesisTermKey = `(&, synthesize_causal_findings, ${contradiction.tasks.map(t => t.termKey).join(', ')})`;
        const parsedSynthesisTerm = parseTerm(synthesisTermKey);
        
        if (parsedSynthesisTerm) {
            const synthesisTask = new Task(
                parsedSynthesisTerm,
                '!',
                {
                    frequency: 0.9,
                    confidence: contradiction.confidence * 0.7
                }
            );
            newTasks.push(synthesisTask);
        }
        
        return newTasks;
    }

    /**
     * Resolves contradictions through hierarchical reconciliation.
     * @param {object} contradiction - The contradiction object.
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    _executeHierarchicalReconciliation(contradiction) {
        const newTasks = [];
        
        // For hierarchical contradictions, we want to preserve the more specific knowledge
        // and revise the more general knowledge
        
        // Create tasks to investigate the hierarchy
        for (const task of contradiction.tasks) {
            const hierarchyInvestigationTermKey = `(&, investigate_hierarchy, ${task.termKey})`;
            const parsedTerm = parseTerm(hierarchyInvestigationTermKey);
            
            if (parsedTerm) {
                const investigationTask = new Task(
                    parsedTerm,
                    '!',
                    {
                        frequency: 1.0,
                        confidence: contradiction.confidence * 0.8
                    }
                );
                newTasks.push(investigationTask);
            }
        }
        
        // Create a meta-task to perform hierarchical reconciliation
        const reconciliationTermKey = `(&, hierarchical_reconciliation, ${contradiction.tasks.map(t => t.termKey).join(', ')})`;
        const parsedReconciliationTerm = parseTerm(reconciliationTermKey);
        
        if (parsedReconciliationTerm) {
            const reconciliationTask = new Task(
                parsedReconciliationTerm,
                '!',
                {
                    frequency: 0.8,
                    confidence: contradiction.confidence * 0.7
                }
            );
            newTasks.push(reconciliationTask);
        }
        
        return newTasks;
    }

    /**
     * Helper to create a standardized meta-task.
     * @param {string} action - The action to be taken (e.g., 'investigate_source').
     * @param {string} targetTermKey - The term key that is the target of the action.
     * @param {number} confidence - The confidence of the meta-task.
     * @returns {Task} A new goal task.
     */
    _createMetaTask(action, targetTermKey, confidence) {
        // Structure the meta-task as a parsable Narsese conjunction: (&, <action>, <target>)
        const metaTermKey = `(&, ${action}, ${targetTermKey})`;
        const parsedMetaTerm = parseTerm(metaTermKey);

        if (!parsedMetaTerm) {
            // console.error(`Failed to parse meta-task term: ${metaTermKey}`);
            return null; // Or handle error appropriately
        }

        return new Task(
            parsedMetaTerm,
            '!', // Meta-tasks are goals
            {
                frequency: 1.0,
                confidence: confidence
            }
        );
    }

    generateContradictionReport(contradictions) {
        if (contradictions.length === 0) {
            return "No contradictions found.";
        }

        let report = `Contradiction Report (${contradictions.length} contradictions found):
`;

        for (let i = 0; i < contradictions.length; i++) {
            const contradiction = contradictions[i];
            report += `${i + 1}. Type: ${contradiction.type}
`;
            report += `   Confidence: ${contradiction.confidence.toFixed(3)}
`;
            report += `   Severity: ${contradiction.severity.toFixed(3)}
`;
            report += `   Details: ${contradiction.details}
`;
            report += `   Tasks:
`;
            for (const task of contradiction.tasks) {
                report += `     - ${task.termKey}${task.punctuation} (freq: ${task.state.truthValue.frequency.toFixed(3)}, conf: ${task.state.truthValue.confidence.toFixed(3)})
`;
            }
            report += `
`;
        }

        return report;
    }
}

module.exports = MetaCognition;