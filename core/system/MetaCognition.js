import {parseTerm} from '../parser/parse-utils.js';
import {debug, info} from '../utils/logger.js';
import {getBeliefTasks} from '../utils/task-utils.js';
import {metaCognitionErrorHandler as errorHandler} from '../utils/errorHandler.js';
import {SystemCommands} from './SystemCommands.js';

class MetaCognition {
    constructor(configManager, contradictionAnalyzer, resolutionStrategy, eventBus, commandBus, metricsService = null) {
        this.configManager = configManager;
        this.contradictionAnalyzer = contradictionAnalyzer;
        this.resolutionStrategy = resolutionStrategy;
        this.eventBus = eventBus;
        this.commandBus = commandBus;
        this.metricsService = metricsService;
        this.contradictions = [];
        this._registerCommandHandlers();
        info('MetaCognition initialized');
    }

    _registerCommandHandlers() {
        this.commandBus.handle(SystemCommands.METACOGNITION_FIND_CONTRADICTIONS, this.findContradictions.bind(this));
        this.commandBus.handle(SystemCommands.METACOGNITION_RESOLVE_CONTRADICTION, this.resolve.bind(this));
    }

    findContradictions(tasks) {
        return errorHandler.executeSync(() => {
            debug(`Finding contradictions in ${tasks.length} tasks`);
            const beliefTasks = getBeliefTasks(tasks);
            debug(`Found ${beliefTasks.length} belief tasks`);

            const parsedBeliefs = beliefTasks
                .map(task => ({
                    task,
                    term: parseTerm(task.termKey)
                }))
                .filter(item => item.term);

            const contradictions = this.contradictionAnalyzer.analyze(parsedBeliefs);
            this.contradictions = contradictions;
            debug(`Found ${contradictions.length} contradictions`);

            return contradictions;
        }, 'findContradictions', []);
    }

    _findContradictionsInParsedBeliefs(parsedBeliefs) {
        this.contradictions = [];
        for (let i = 0; i < parsedBeliefs.length; i++) {
            for (let j = i + 1; j < parsedBeliefs.length; j++) {
                const item1 = parsedBeliefs[i];
                const item2 = parsedBeliefs[j];
                errorHandler.executeSync(() => {
                    const contradictionType = this.contradictionAnalyzer.analyze(item1.task, item2.task, item1.parsed, item2.parsed);
                    if (contradictionType) {
                        this.contradictions.push({
                            type: contradictionType.type,
                            tasks: [item1.task, item2.task],
                            confidence: Math.min(item1.task.state.truthValue.confidence, item2.task.state.truthValue.confidence),
                            details: contradictionType.details,
                            severity: this.contradictionAnalyzer.calculateSeverity(contradictionType, item1.task, item2.task),
                        });

                        // Track contradiction detection in metrics
                        if (this.metricsService) {
                            this.metricsService.trackContradictionDetection(contradictionType.type);
                        }
                    }
                }, `analyze-contradiction-${item1.task.id}-${item2.task.id}`);
            }
        }
        debug(`Found ${this.contradictions.length} contradictions`);
        return this.contradictions;
    }

    getContradictions() {
        return this.contradictions;
    }


    resolve({
                contradiction,
                strategy
            }) {
        return errorHandler.executeSync(() => {
            debug(`Resolving contradiction of type: ${contradiction.type}`);
            const startTime = Date.now();
            let success = false;
            let result;

            try {
                result = this.resolutionStrategy.resolve(contradiction, strategy);
                success = !!result && result.length > 0;
            } catch (error) {
                debug(`Contradiction resolution failed: ${error.message}`);
                result = [];
            } finally {
                const executionTime = Date.now() - startTime;

                // Track contradiction resolution in metrics
                if (this.metricsService) {
                    this.metricsService.trackContradictionResolution(
                        contradiction.type,
                        strategy || 'default',
                        success,
                        success ? 'success' : 'failure'
                    );
                }
            }

            debug('Contradiction resolution completed');
            return result;
        }, 'resolve', []);
    }

    generateContradictionReport(contradictions) {
        if (!contradictions.length) {
            debug('No contradictions to report');
            return 'No contradictions found.';
        }
        debug(`Generating report for ${contradictions.length} contradictions`);
        const reportHeader = `Contradiction Report (${contradictions.length} found):\n`;
        const reportBody = contradictions.map((c, i) =>
            `${i + 1}. Type: ${c.type}
   Confidence: ${c.confidence.toFixed(3)}
   Severity: ${c.severity.toFixed(3)}
   Details: ${c.details}
   Tasks:
${c.tasks.map(t => `     - ${t.termKey}${t.punctuation} (f: ${t.state.truthValue.frequency.toFixed(3)}, c: ${t.state.truthValue.confidence.toFixed(3)})`).join('\n')}`
        ).join('\n');
        return reportHeader + reportBody;
    }
}

export default MetaCognition;
