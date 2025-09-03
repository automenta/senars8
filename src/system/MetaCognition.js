const { parseTerm } = require('../parser/TermParser');
const Task = require('../core/Task');

/**
 * Meta-Cognition System
 * Handles contradiction detection, analysis, and remediation.
 */
class MetaCognition {
    /**
     * Finds contradictions in the memory.
     * @param {Array} tasks - Array of tasks to check for contradictions.
     * @returns {Array} Array of contradictions found.
     */
    findContradictions(tasks) {
        const contradictions = [];
        const beliefTasks = tasks.filter(task => task.punctuation === '.');
        
        // Check for direct contradictions (A. and (--, A).)
        for (let i = 0; i < beliefTasks.length; i++) {
            for (let j = i + 1; j < beliefTasks.length; j++) {
                const task1 = beliefTasks[i];
                const task2 = beliefTasks[j];
                
                const contradictionType = this.analyzeContradiction(task1, task2);
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
        
        return contradictions;
    }
    
    /**
     * Calculates the severity of a contradiction based on confidence and frequency differences.
     * @param {object} contradictionType - The type of contradiction.
     * @param {Task} task1 - First task.
     * @param {Task} task2 - Second task.
     * @returns {number} Severity score between 0 and 1.
     */
    calculateContradictionSeverity(contradictionType, task1, task2) {
        // Base severity on confidence and frequency differences
        const confidenceDiff = Math.abs(task1.state.truthValue.confidence - task2.state.truthValue.confidence);
        const frequencyDiff = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency);
        
        // Weight different contradiction types
        let typeWeight = 1.0;
        switch (contradictionType.type) {
            case 'direct_negation':
                typeWeight = 1.0;
                break;
            case 'inheritance_conflict':
                typeWeight = 0.8;
                break;
            case 'frequency_conflict':
                typeWeight = 0.6;
                break;
            default:
                typeWeight = 0.5;
        }
        
        // Severity is a combination of factors
        return Math.min(1.0, (confidenceDiff + frequencyDiff) * typeWeight / 2);
    }
    
    /**
     * Analyzes the type of contradiction between two tasks.
     * @param {Task} task1 - First task.
     * @param {Task} task2 - Second task.
     * @returns {object|null} Contradiction analysis or null if not contradictory.
     */
    analyzeContradiction(task1, task2) {
        // Simple case: A. and (--, A).
        const parsed1 = parseTerm(task1.termKey);
        const parsed2 = parseTerm(task2.termKey);
        
        if (!parsed1 || !parsed2) return null;
        
        // Check if one is negation of the other
        if (parsed1.type === 'Negation' && parsed1.term === task2.termKey) {
            return {
                type: 'direct_negation',
                details: `Direct negation between "${task2.termKey}" and "${task1.termKey}"`
            };
        }
        
        if (parsed2.type === 'Negation' && parsed2.term === task1.termKey) {
            return {
                type: 'direct_negation',
                details: `Direct negation between "${task1.termKey}" and "${task2.termKey}"`
            };
        }
        
        // Check for conflicting inheritances (A --> B and A --> (--, B))
        if (parsed1.type === 'Inheritance' && parsed2.type === 'Inheritance' && 
            parsed1.subject === parsed2.subject) {
            // Parse the predicates
            const pred1Parsed = parseTerm(parsed1.predicate);
            const pred2Parsed = parseTerm(parsed2.predicate);
            
            // Check if one predicate is negation of the other
            if (pred1Parsed && pred2Parsed && pred1Parsed.type === 'Negation' && 
                pred1Parsed.term === parsed2.predicate) {
                return {
                    type: 'inheritance_conflict',
                    details: `Inheritance conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
            
            if (pred1Parsed && pred2Parsed && pred2Parsed.type === 'Negation' && 
                pred2Parsed.term === parsed1.predicate) {
                return {
                    type: 'inheritance_conflict',
                    details: `Inheritance conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
        }
        
        // Check for conflicting frequencies with high confidence
        if (Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8 &&
            task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8) {
            return {
                type: 'frequency_conflict',
                details: `High confidence frequency conflict between "${task1.termKey}" (${task1.state.truthValue.frequency}) and "${task2.termKey}" (${task2.state.truthValue.frequency})`
            };
        }
        
        // Check for implication contradictions ((A ==> B) and (A ==> (--, B)))
        if (parsed1.type === 'Implication' && parsed2.type === 'Implication' &&
            parsed1.subject === parsed2.subject) {
            // Parse the predicates
            const pred1Parsed = parseTerm(parsed1.predicate);
            const pred2Parsed = parseTerm(parsed2.predicate);
            
            // Check if one predicate is negation of the other
            if (pred1Parsed && pred2Parsed && pred1Parsed.type === 'Negation' && 
                pred1Parsed.term === parsed2.predicate) {
                return {
                    type: 'implication_conflict',
                    details: `Implication conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
            
            if (pred1Parsed && pred2Parsed && pred2Parsed.type === 'Negation' && 
                pred2Parsed.term === parsed1.predicate) {
                return {
                    type: 'implication_conflict',
                    details: `Implication conflict: "${task1.termKey}" vs "${task2.termKey}"`
                };
            }
        }
        
        return null;
    }
    
    /**
     * Analyzes contradictions and generates remediation tasks.
     * @param {Array} contradictions - Array of contradictions to analyze.
     * @returns {Array} Array of remediation tasks.
     */
    analyzeFailures(contradictions) {
        const metaTasks = [];
        
        for (const contradiction of contradictions) {
            // Create a high-priority task to resolve the contradiction
            const contradictionTask = new Task(
                `contradiction_resolution_${Date.now()}`,
                '!',
                {
                    frequency: 1.0,
                    confidence: contradiction.confidence
                }
            );
            
            // Add to meta tasks
            metaTasks.push(contradictionTask);
            
            // Generate specific remediation goals based on contradiction type and severity
            const severity = contradiction.severity || 0.5;
            
            switch (contradiction.type) {
                case 'direct_negation':
                    // For direct negations, we need to investigate the source
                    for (const task of contradiction.tasks) {
                        const remediationTask = new Task(
                            `investigate_source_of_${task.termKey}`,
                            '!',
                            {
                                frequency: 1.0,
                                confidence: task.state.truthValue.confidence * 0.8
                            }
                        );
                        metaTasks.push(remediationTask);
                    }
                    
                    // If severity is high, suggest revision of one of the beliefs
                    if (severity > 0.7) {
                        const revisionTask = new Task(
                            `revise_contradictory_beliefs_${contradiction.tasks[0].termKey}_${contradiction.tasks[1].termKey}`,
                            '!',
                            {
                                frequency: 0.5, // Uncertain which to revise
                                confidence: 0.9
                            }
                        );
                        metaTasks.push(revisionTask);
                    }
                    break;
                    
                case 'inheritance_conflict':
                    // For inheritance conflicts, we need to check the hierarchy
                    const remediationTask = new Task(
                        `resolve_inheritance_hierarchy_conflict`,
                        '!',
                        {
                            frequency: 1.0,
                            confidence: contradiction.confidence * 0.9
                        }
                    );
                    metaTasks.push(remediationTask);
                    
                    // Suggest gathering more evidence about the hierarchy
                    const evidenceTask = new Task(
                        `gather_evidence_for_inheritance_${contradiction.tasks[0].termKey}_${contradiction.tasks[1].termKey}`,
                        '!',
                        {
                            frequency: 1.0,
                            confidence: 0.8
                        }
                    );
                    metaTasks.push(evidenceTask);
                    break;
                    
                case 'frequency_conflict':
                    // For frequency conflicts, we need to gather more evidence
                    const evidenceTask2 = new Task(
                        `gather_more_evidence_for_conflicting_frequencies`,
                        '!',
                        {
                            frequency: 1.0,
                            confidence: contradiction.confidence * 0.7
                        }
                    );
                    metaTasks.push(evidenceTask2);
                    
                    // Suggest performing experimental validation
                    const validationTask = new Task(
                        `validate_frequency_conflict_through_experimentation`,
                        '!',
                        {
                            frequency: 0.8,
                            confidence: 0.9
                        }
                    );
                    metaTasks.push(validationTask);
                    break;
                    
                case 'implication_conflict':
                    // For implication conflicts, we need to check the antecedent
                    const antecedentTask = new Task(
                        `investigate_antecedent_${contradiction.tasks[0].termKey}`,
                        '!',
                        {
                            frequency: 1.0,
                            confidence: 0.8
                        }
                    );
                    metaTasks.push(antecedentTask);
                    
                    // Suggest revision of one of the implications
                    const revisionTask2 = new Task(
                        `revise_conflicting_implications`,
                        '!',
                        {
                            frequency: 0.5,
                            confidence: 0.9
                        }
                    );
                    metaTasks.push(revisionTask2);
                    break;
                    
                default:
                    // Generic remediation for other types
                    for (const task of contradiction.tasks) {
                        const remediationTask = new Task(
                            `resolve_contradiction_with_${task.termKey}`,
                            '!',
                            {
                                frequency: 1.0,
                                confidence: task.state.truthValue.confidence * 0.8
                            }
                        );
                        metaTasks.push(remediationTask);
                    }
            }
        }
        
        return metaTasks;
    }
    
    /**
     * Performs backward reasoning to find the source of a contradiction.
     * @param {Task} contradictoryTask - The contradictory task.
     * @param {Map} taskDerivations - Map of task derivations.
     * @returns {Task|null} The premise task with lowest confidence that contributed to the error.
     */
    findFaultyPremise(contradictoryTask, taskDerivations) {
        // This is a simplified implementation
        // In a full system, this would trace back through the derivation tree
        const derivations = taskDerivations.get(contradictoryTask.id) || [];
        
        if (derivations.length === 0) {
            return null;
        }
        
        // Find the premise with the lowest confidence
        let lowestConfidenceTask = derivations[0];
        for (const premise of derivations) {
            if (premise.state.truthValue.confidence < lowestConfidenceTask.state.truthValue.confidence) {
                lowestConfidenceTask = premise;
            }
        }
        
        return lowestConfidenceTask;
    }
    
    /**
     * Generates a report of all contradictions for external analysis.
     * @param {Array} contradictions - Array of contradictions.
     * @returns {string} A formatted report.
     */
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
    
    /**
     * Resolves contradictions by suggesting revision strategies.
     * @param {Array} contradictions - Array of contradictions to resolve.
     * @returns {Array} Array of resolution strategies.
     */
    resolveContradictions(contradictions) {
        const resolutions = [];
        
        for (const contradiction of contradictions) {
            const resolution = {
                contradictionId: `${contradiction.type}_${contradiction.tasks.map(t => t.id).join('_')}`,
                tasks: contradiction.tasks,
                strategy: null,
                confidence: contradiction.confidence
            };
            
            // Choose resolution strategy based on contradiction type and severity
            const severity = contradiction.severity || 0.5;
            
            if (severity > 0.8) {
                // High severity contradictions require immediate attention
                resolution.strategy = 'revision';
            } else if (severity > 0.5) {
                // Medium severity contradictions require evidence gathering
                resolution.strategy = 'evidence_gathering';
            } else {
                // Low severity contradictions can be monitored
                resolution.strategy = 'monitoring';
            }
            
            resolutions.push(resolution);
        }
        
        return resolutions;
    }
    
    /**
     * Generates meta-cognitive insights from contradictions.
     * @param {Array} contradictions - Array of contradictions.
     * @returns {Array} Array of insight tasks.
     */
    generateInsights(contradictions) {
        const insights = [];
        
        // Count contradiction types
        const typeCounts = {};
        for (const contradiction of contradictions) {
            typeCounts[contradiction.type] = (typeCounts[contradiction.type] || 0) + 1;
        }
        
        // Generate insights based on patterns
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > 1) {
                const insightTask = new Task(
                    `pattern_detected_in_${type}_contradictions`,
                    '.',
                    {
                        frequency: Math.min(1.0, count / 10), // More frequent patterns have higher frequency
                        confidence: 0.9
                    }
                );
                insights.push(insightTask);
            }
        }
        
        // Generate insight about overall contradiction load
        if (contradictions.length > 5) {
            const loadInsight = new Task(
                'high_contradiction_load_detected',
                '.',
                {
                    frequency: 1.0,
                    confidence: 0.95
                }
            );
            insights.push(loadInsight);
        }
        
        return insights;
    }
}

module.exports = MetaCognition;