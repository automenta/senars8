import {parseTerm} from '../parser/parse-utils.js';
import ContradictionAnalyzer from '../reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../reasoner/strategies/ResolutionStrategy.js';
import {debug, error, info} from '../utils/logger.js';
import {getBeliefTasks} from '../utils/index.js';
import {handleErrorWithDefault} from '../utils/errorHandler.js';
import EventBus from './EventBus.js';
import defaultConfig from '../config/default-config.js';

class MetaCognition {
    constructor(config = defaultConfig, dependencies = {}) {
        this.config = config;
        this.contradictionAnalyzer = dependencies.contradictionAnalyzer || new ContradictionAnalyzer();
        this.resolutionStrategy = dependencies.resolutionStrategy || new ResolutionStrategy();
        info('MetaCognition initialized');

        EventBus.handle('MetaCognition.findContradictions', this.findContradictions.bind(this));
        EventBus.handle('MetaCognition.resolve', this.resolve.bind(this));
    }

    findContradictions(tasks) {
        try {
            debug(`Finding contradictions in ${tasks.length} tasks`);
            const beliefTasks = getBeliefTasks(tasks);
            debug(`Found ${beliefTasks.length} belief tasks`);

            const parsedBeliefs = beliefTasks.map(task => ({
                task,
                parsed: parseTerm(task.termKey)
            })).filter(item => item.parsed);

            debug(`Successfully parsed ${parsedBeliefs.length} belief tasks`);
            let contradictionCount = 0;
            const pairwiseContradictions = parsedBeliefs.flatMap((item1, i) => {
                try {
                    return parsedBeliefs.slice(i + 1).map(item2 => {
                        try {
                            const contradictionType = this.contradictionAnalyzer.analyze(item1.task, item2.task, item1.parsed, item2.parsed);
                            if (!contradictionType) {
                                return null;
                            }

                            contradictionCount++;
                            return {
                                type: contradictionType.type,
                                tasks: [item1.task, item2.task],
                                confidence: Math.min(item1.task.state.truthValue.confidence, item2.task.state.truthValue.confidence),
                                details: contradictionType.details,
                                severity: this.contradictionAnalyzer.calculateSeverity(contradictionType, item1.task, item2.task)
                            };
                        } catch (err) {
                            error(`Error analyzing contradiction between ${item1.task.termKey} and ${item2.task.termKey}:`, err);
                            return null;
                        }
                    }).filter(Boolean);
                } catch (err) {
                    error(`Error processing belief pair at index ${i}:`, err);
                    return [];
                }
            });

            debug(`Found ${contradictionCount} contradictions`);
            return pairwiseContradictions;
        } catch (err) {
            error('Error finding contradictions:', err);
            return handleErrorWithDefault(err, 'Contradiction detection error', []);
        }
    }

    resolve({contradiction, strategy}) {
        try {
            debug(`Resolving contradiction of type: ${contradiction.type}`);
            const result = this.resolutionStrategy.resolve(contradiction, strategy);
            debug('Contradiction resolution completed');
            return result;
        } catch (err) {
            error('Error resolving contradiction:', err);
            return handleErrorWithDefault(err, 'Contradiction resolution error', []);
        }
    }

    generateContradictionReport(contradictions) {
        try {
            if (contradictions.length === 0) {
                debug('No contradictions to report');
                return 'No contradictions found.';
            }

            debug(`Generating report for ${contradictions.length} contradictions`);
            let report = `Contradiction Report (${contradictions.length} found):
`;

            contradictions.forEach((c, i) => {
                report += `${i + 1}. Type: ${c.type}
`;
                report += `   Confidence: ${c.confidence.toFixed(3)
                }`;
                report += `   Severity: ${c.severity.toFixed(3)
                }`;
                report += `   Details: ${c.details
                }`;
                report += `   Tasks:
`;
                c.tasks.forEach(t => {
                    report += `     - ${t.termKey}${t.punctuation} (f: ${t.state.truthValue.frequency.toFixed(3)}, c: ${t.state.truthValue.confidence.toFixed(3)})
`;
                });
                report += `
`;
            });

            return report;
        } catch (err) {
            error('Error generating contradiction report:', err);
            return handleErrorWithDefault(err, 'Contradiction report generation error', 'Error generating contradiction report.');
        }
    }
}

export default MetaCognition;
