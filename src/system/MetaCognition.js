const {parseTerm} = require('../parser/TermParser');
const Task = require('../core/Task');

class MetaCognition {
    findContradictions(tasks) {
        const contradictions = [];
        const beliefTasks = tasks.filter(task => task.punctuation === '.');

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

    calculateContradictionSeverity(contradictionType, task1, task2) {
        const confidenceDiff = Math.abs(task1.state.truthValue.confidence - task2.state.truthValue.confidence);
        const frequencyDiff = Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency);

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

        return Math.min(1.0, (confidenceDiff + frequencyDiff) * typeWeight / 2);
    }

    analyzeContradiction(task1, task2) {
        const parsed1 = parseTerm(task1.termKey);
        const parsed2 = parseTerm(task2.termKey);

        if (!parsed1 || !parsed2) return null;

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

        if (parsed1.type === 'Inheritance' && parsed2.type === 'Inheritance' &&
            parsed1.subject === parsed2.subject) {
            const pred1Parsed = parseTerm(parsed1.predicate);
            const pred2Parsed = parseTerm(parsed2.predicate);

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

        if (Math.abs(task1.state.truthValue.frequency - task2.state.truthValue.frequency) > 0.8 &&
            task1.state.truthValue.confidence > 0.8 && task2.state.truthValue.confidence > 0.8) {
            return {
                type: 'frequency_conflict',
                details: `High confidence frequency conflict between "${task1.termKey}" (${task1.state.truthValue.frequency}) and "${task2.termKey}" (${task2.state.truthValue.frequency})`
            };
        }

        if (parsed1.type === 'Implication' && parsed2.type === 'Implication' &&
            parsed1.subject === parsed2.subject) {
            const pred1Parsed = parseTerm(parsed1.predicate);
            const pred2Parsed = parseTerm(parsed2.predicate);

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

    analyzeFailures(contradictions) {
        const metaTasks = [];

        for (const contradiction of contradictions) {
            const contradictionTask = new Task(
                parseTerm(`contradiction_resolution_${Date.now()}`),
                '!',
                {
                    frequency: 1.0,
                    confidence: contradiction.confidence
                }
            );

            metaTasks.push(contradictionTask);

            const severity = contradiction.severity || 0.5;

            switch (contradiction.type) {
                case 'direct_negation':
                    for (const task of contradiction.tasks) {
                        const remediationTask = new Task(
                            parseTerm(`investigate_source_of_${task.termKey}`),
                            '!',
                            {
                                frequency: 1.0,
                                confidence: task.state.truthValue.confidence * 0.8
                            }
                        );
                        metaTasks.push(remediationTask);
                    }

                    if (severity > 0.7) {
                        const revisionTask = new Task(
                            parseTerm(`revise_contradictory_beliefs_${contradiction.tasks[0].termKey}_${contradiction.tasks[1].termKey}`),
                            '!',
                            {
                                frequency: 0.5,
                                confidence: 0.9
                            }
                        );
                        metaTasks.push(revisionTask);
                    }
                    break;

                case 'inheritance_conflict':
                    const remediationTask = new Task(
                        parseTerm(`resolve_inheritance_hierarchy_conflict`),
                        '!',
                        {
                            frequency: 1.0,
                            confidence: contradiction.confidence * 0.9
                        }
                    );
                    metaTasks.push(remediationTask);

                    const evidenceTask = new Task(
                        parseTerm(`gather_evidence_for_inheritance_${contradiction.tasks[0].termKey}_${contradiction.tasks[1].termKey}`),
                        '!',
                        {
                            frequency: 1.0,
                            confidence: 0.8
                        }
                    );
                    metaTasks.push(evidenceTask);
                    break;

                case 'frequency_conflict':
                    const evidenceTask2 = new Task(
                        parseTerm(`gather_more_evidence_for_conflicting_frequencies`),
                        '!',
                        {
                            frequency: 1.0,
                            confidence: contradiction.confidence * 0.7
                        }
                    );
                    metaTasks.push(evidenceTask2);

                    const validationTask = new Task(
                        parseTerm(`validate_frequency_conflict_through_experimentation`),
                        '!',
                        {
                            frequency: 0.8,
                            confidence: 0.9
                        }
                    );
                    metaTasks.push(validationTask);
                    break;

                case 'implication_conflict':
                    const antecedentTask = new Task(
                        parseTerm(`investigate_antecedent_${contradiction.tasks[0].termKey}`),
                        '!',
                        {
                            frequency: 1.0,
                            confidence: 0.8
                        }
                    );
                    metaTasks.push(antecedentTask);

                    const revisionTask2 = new Task(
                        parseTerm(`revise_conflicting_implications`),
                        '!',
                        {
                            frequency: 0.5,
                            confidence: 0.9
                        }
                    );
                    metaTasks.push(revisionTask2);
                    break;

                default:
                    for (const task of contradiction.tasks) {
                        const remediationTask = new Task(
                            parseTerm(`resolve_contradiction_with_${task.termKey}`),
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

    findFaultyPremise(contradictoryTask, taskDerivations) {
        const derivations = taskDerivations.get(contradictoryTask.id) || [];

        if (derivations.length === 0) {
            return null;
        }

        let lowestConfidenceTask = derivations[0];
        for (const premise of derivations) {
            if (premise.state.truthValue.confidence < lowestConfidenceTask.state.truthValue.confidence) {
                lowestConfidenceTask = premise;
            }
        }

        return lowestConfidenceTask;
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

    resolveContradictions(contradictions) {
        const resolutions = [];

        for (const contradiction of contradictions) {
            const resolution = {
                contradictionId: `${contradiction.type}_${contradiction.tasks.map(t => t.id).join('_')}`,
                tasks: contradiction.tasks,
                strategy: null,
                confidence: contradiction.confidence
            };

            const severity = contradiction.severity || 0.5;

            if (severity > 0.8) {
                resolution.strategy = 'revision';
            } else if (severity > 0.5) {
                resolution.strategy = 'evidence_gathering';
            } else {
                resolution.strategy = 'monitoring';
            }

            resolutions.push(resolution);
        }

        return resolutions;
    }

    generateInsights(contradictions) {
        const insights = [];

        const typeCounts = {};
        for (const contradiction of contradictions) {
            typeCounts[contradiction.type] = (typeCounts[contradiction.type] || 0) + 1;
        }

        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > 1) {
                const insightTask = new Task(
                    parseTerm(`pattern_detected_in_${type}_contradictions`),
                    '.',
                    {
                        frequency: Math.min(1.0, count / 10),
                        confidence: 0.9
                    }
                );
                insights.push(insightTask);
            }
        }

        if (contradictions.length > 5) {
            const loadInsight = new Task(
                parseTerm('high_contradiction_load_detected'),
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