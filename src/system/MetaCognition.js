import {parseTerm} from '../parser/parse-utils.js';
import ContradictionAnalyzer from '../reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../reasoner/strategies/ResolutionStrategy.js';
import {debug, error, info} from '../utils/logger.js';
import {getBeliefTasks} from '../utils/task-utils.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import EventBus from './EventBus.js';

const errorHandler = createModuleErrorHandler('MetaCognition');

class MetaCognition {
    constructor(configManager, dependencies = {}) {
        this.configManager = configManager;
        this.contradictionAnalyzer = dependencies.contradictionAnalyzer || new ContradictionAnalyzer();
        this.resolutionStrategy = dependencies.resolutionStrategy || new ResolutionStrategy();
        info('MetaCognition initialized', { module: 'system/MetaCognition' });

        EventBus.handle('MetaCognition.findContradictions', this.findContradictions.bind(this));
        EventBus.handle('MetaCognition.resolve', this.resolve.bind(this));
    }

    findContradictions(tasks) {
        return errorHandler.safeSync(() => {
            debug(`Finding contradictions in ${tasks.length} tasks`, { module: 'system/MetaCognition' });
            const beliefTasks = getBeliefTasks(tasks);
            debug(`Found ${beliefTasks.length} belief tasks`, { module: 'system/MetaCognition' });

            const parsedBeliefs = beliefTasks.map(task => ({
                task,
                parsed: parseTerm(task.termKey)
            })).filter(item => item.parsed);
            debug(`Successfully parsed ${parsedBeliefs.length} belief tasks`, { module: 'system/MetaCognition' });

            return this._findContradictionsInParsedBeliefs(parsedBeliefs);
        }, 'findContradictions', []);
    }

    _findContradictionsInParsedBeliefs(parsedBeliefs) {
        let contradictionCount = 0;
        const contradictions = [];
        for (let i = 0; i < parsedBeliefs.length; i++) {
            for (let j = i + 1; j < parsedBeliefs.length; j++) {
                const item1 = parsedBeliefs[i];
                const item2 = parsedBeliefs[j];
                errorHandler.safeSync(() => {
                    const contradictionType = this.contradictionAnalyzer.analyze(item1.task, item2.task, item1.parsed, item2.parsed);
                    if (contradictionType) {
                        contradictionCount++;
                        contradictions.push({
                            type: contradictionType.type,
                            tasks: [item1.task, item2.task],
                            confidence: Math.min(item1.task.state.truthValue.confidence, item2.task.state.truthValue.confidence),
                            details: contradictionType.details,
                            severity: this.contradictionAnalyzer.calculateSeverity(contradictionType, item1.task, item2.task)
                        });
                    }
                }, `analyze-contradiction-${item1.task.id}-${item2.task.id}`);
            }
        }
        debug(`Found ${contradictionCount} contradictions`, { module: 'system/MetaCognition' });
        return contradictions;
    }


    resolve({
                contradiction,
                strategy
            }) {
        return errorHandler.safeSync(() => {
            debug(`Resolving contradiction of type: ${contradiction.type}`, { module: 'system/MetaCognition' });
            const result = this.resolutionStrategy.resolve(contradiction, strategy);
            debug('Contradiction resolution completed', { module: 'system/MetaCognition' });
            return result;
        }, 'resolve', []);
    }

    generateContradictionReport(contradictions) {
        if (contradictions.length === 0) {
            debug('No contradictions to report', { module: 'system/MetaCognition' });
            return 'No contradictions found.';
        }
        debug(`Generating report for ${contradictions.length} contradictions`, { module: 'system/MetaCognition' });
        const reportHeader = `Contradiction Report (${contradictions.length} found):\n`;
        const reportBody = contradictions.map((c, i) => `
${i + 1}. Type: ${c.type}
   Confidence: ${c.confidence.toFixed(3)}
   Severity: ${c.severity.toFixed(3)}
   Details: ${c.details}
   Tasks:
${c.tasks.map(t => `     - ${t.termKey}${t.punctuation} (f: ${t.state.truthValue.frequency.toFixed(3)}, c: ${t.state.truthValue.confidence.toFixed(3)})`).join('\n')}
`).join('');
        return reportHeader + reportBody;
    }
}

export default MetaCognition;
