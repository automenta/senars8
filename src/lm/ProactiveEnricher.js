import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {debug} from '../utils/logger.js';
import {parseTerm} from '../parser/parse-utils.js';
import Task from '../core/Task.js';
import {getBeliefTasks} from '../utils/task-utils.js';
import zod from 'zod';

const errorHandler = createModuleErrorHandler('ProactiveEnricher');

class ProactiveEnricher {
    constructor(getGenerationPipeline, createStructuredChain, parseStructuredResult) {
        this._getGenerationPipeline = getGenerationPipeline;
        this._createStructuredChain = createStructuredChain;
        this._parseStructuredResult = parseStructuredResult;
    }

    async proactiveEnrichment(tasks) {
        if (!tasks || tasks.length === 0) {
            debug('No tasks for proactive enrichment');
            return [];
        }

        return await errorHandler.safeAsync(async () => {
            debug(`Performing proactive enrichment on ${tasks.length} tasks`);
            await this._getGenerationPipeline();

            const context = this._createProactiveEnrichmentContext(tasks);
            if (!context) {
                debug('No high-confidence beliefs for enrichment');
                return [];
            }

            const prompt = `${context}\n\nWhat are some interesting implications or related concepts? Generate new knowledge in Narsese format.`;
            const chain = this._createStructuredChain(
                prompt,
                zod.object({new_knowledge: zod.array(zod.string()).describe('A list of new Narsese statements.')}),
                {}
            );

            const result = await chain.call({context: ''});
            const parsed = this._parseStructuredResult(result.text);

            if (!parsed || !parsed.new_knowledge) {
                debug('Proactive enrichment failed to parse results');
                return [];
            }

            const newTasks = parsed.new_knowledge.map(termKey => {
                const parsedTerm = parseTerm(termKey);
                return parsedTerm ? new Task(parsedTerm, '.', {confidence: 0.6, frequency: 0.5}) : null;
            }).filter(Boolean);

            debug(`Proactive enrichment generated ${newTasks.length} new tasks`);
            return newTasks;
        }, 'proactiveEnrichment', []);
    }

    _createProactiveEnrichmentContext(tasks) {
        const newBeliefs = getBeliefTasks(tasks).filter(t => t.state.truthValue.confidence > 0.8);
        if (newBeliefs.length === 0) {
            return null;
        }

        debug(`Found ${newBeliefs.length} high-confidence beliefs for enrichment`);
        return `Given the following new beliefs:\n${newBeliefs.map(t => t.termKey).join('\n')}`;
    }
}

export default ProactiveEnricher;
