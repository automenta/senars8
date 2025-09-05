const {
    parseTerm
} = require('../parser/NewParser');
const Task = require('../core/Task');

class MetaCognition {
    findContradictions(tasks) {
        const contradictions = [];
        const beliefTasks = tasks.filter(task => task.punctuation === '.');

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
                typeWeight = 0.8;
                break;
            case 'frequency_conflict':
                typeWeight = 0.6;
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
            this._analyzeFrequencyConflict(task1, task2) // Check frequency last as it's less specific
        );
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
        if (parsed1.type !== 'Inheritance' || parsed2.type !== 'Inheritance' || parsed1.subject.key !== parsed2.subject.key) {
            return null;
        }

        // The predicate of an Inheritance term is a parsed term object.
        // e.g., for (S --> P), predicate is the parsed object for P.
        const pred1 = parsed1.predicate;
        const pred2 = parsed2.predicate;

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
     * Resolves a contradiction based on a defined strategy.
     * @param {object} contradiction - The contradiction object.
     * @param {string} strategy - The resolution strategy ('revision', 'evidence_gathering', 'monitoring').
     * @returns {Task[]} An array of new tasks generated from the resolution.
     */
    resolve(contradiction, strategy) {
        switch (strategy) {
            case 'revision':
                return this._executeRevision(contradiction);
            case 'evidence_gathering':
                return this._executeEvidenceGathering(contradiction);
            case 'monitoring':
            default:
                return []; // Monitoring means do nothing for now.
        }
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