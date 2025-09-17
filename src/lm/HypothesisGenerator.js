import Task from '../core/Task.js';
import {cosineSimilarity} from '../utils/math.js';
import {parseTerm} from '../parser/parse-utils.js';
import config from '../config/index.js';
import zod from 'zod';
import MetaCognition from '../system/MetaCognition.js';

const HYPOTHESIS_TYPES = {
    GENERAL: 'general',
    CREATIVE: 'creative',
    GOAL_ORIENTED: 'goal_oriented'
};

const REFINEMENT_TYPES = {
    FORMALIZE: 'formalize',
    SIMPLIFY: 'simplify'
};

class HypothesisGenerator {
    constructor(lm) {
        if (!lm) {
            throw new Error('HypothesisGenerator requires an instance of LM.');
        }
        this.lm = lm;
    }

    _buildHypothesisContext(tasks, goals, contradictions) {
        const sections = [
            {title: 'Observations', items: tasks, format: task => `${task.termKey}${task.punctuation}`},
            {title: 'Current Goals', items: goals, format: task => `${task.termKey}${task.punctuation}`},
            {
                title: 'Recent Contradictions',
                items: contradictions,
                format: c => `${c.taskA.termKey} vs ${c.taskB.termKey}`
            },
        ];

        return sections
            .filter(section => section.items.length > 0)
            .map(section => `${section.title}:\n${section.items.map(section.format).join('\n')}`)
            .join('\n\n');
    }

    _createHypothesisPrompt(type, promptTemplate) {
        if (promptTemplate) return promptTemplate;
        const prompts = {
            [HYPOTHESIS_TYPES.GENERAL]: 'Based on the following context:\n{context}\n\nA general principle that explains these observations is:',
            [HYPOTHESIS_TYPES.CREATIVE]: 'Based on the following context:\n{context}\n\nA surprising insight that explains these observations is:',
            [HYPOTHESIS_TYPES.GOAL_ORIENTED]: 'Given the following context:\n{context}\n\nA useful hypothesis to explore to achieve the current goals is:',
        };
        return prompts[type] || prompts[HYPOTHESIS_TYPES.GENERAL];
    }

    async generateHypotheses(tasks, options = {}) {
        if (!tasks?.length) return [];
        await this.lm.getGenerationPipeline();

        const {
            type = HYPOTHESIS_TYPES.GENERAL,
            num = 3,
            refinement = null,
            promptTemplate = null,
            goals = [],
            contradictions = [],
        } = options;

        const context = this._buildHypothesisContext(tasks, goals, contradictions);
        const selectedPrompt = this._createHypothesisPrompt(type, promptTemplate);
        const chain = this.lm.createStructuredChain(selectedPrompt, zod.object({term: zod.string().describe('The generated hypothesis in valid Narsese format.')}), {});

        const results = await Promise.all(Array(num).fill().map(() => chain.call({context})));

        const hypotheses = results
            .map(result => {
                const parsed = this.lm.parseStructuredResult(result.text);
                if (!parsed?.term) return null;
                const parsedTerm = parseTerm(parsed.term);
                return parsedTerm ? new Task(parsedTerm, '.', {confidence: 0.5, frequency: 0.5}) : null;
            })
            .filter(Boolean);

        return refinement ? Promise.all(hypotheses.map(h => this.refineHypothesis(h, refinement))) : hypotheses;
    }

    async generateHypothesis(task, options = {}) {
        if (!task) {
            return null;
        }
        return (await this.generateHypotheses([task], {...options, num: 1}))[0] || null;
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        if (!hypotheses?.length) return [];
        const extractor = await this.lm.getFeaturePipeline();

        const getEmbedding = async (termKey) => {
            const output = await extractor(termKey, {pooling: 'mean', normalize: true});
            return Array.from(output.data);
        };

        const taskEmbeddings = await Promise.all(tasks.map(task => getEmbedding(task.termKey)));

        const evaluatedHypotheses = await Promise.all(
            hypotheses.map(async hypothesis => {
                const hypothesisEmbedding = await getEmbedding(hypothesis.termKey);
                const totalSimilarity = taskEmbeddings.reduce((sum, taskEmbedding) => sum + cosineSimilarity(hypothesisEmbedding, taskEmbedding), 0);
                const averageRelevance = taskEmbeddings.length > 0 ? totalSimilarity / taskEmbeddings.length : 0;
                hypothesis.state.truthValue.confidence = Math.min(config.DEFAULT_TRUTH_VALUE.confidence, (hypothesis.state.truthValue.confidence || 0.5) * (0.5 + 0.5 * averageRelevance));
                return {hypothesis, relevance: averageRelevance};
            })
        );

        return evaluatedHypotheses.sort((a, b) => b.relevance - a.relevance).map(item => item.hypothesis);
    }

    async refineHypothesis(hypothesis, refinementType = REFINEMENT_TYPES.FORMALIZE) {
        const prompts = {
            [REFINEMENT_TYPES.FORMALIZE]: `Refine into a more formal statement: ${hypothesis.termKey}`,
            [REFINEMENT_TYPES.SIMPLIFY]: `Simplify into a more concise statement: ${hypothesis.termKey}`,
        };
        const prompt = prompts[refinementType] || prompts[REFINEMENT_TYPES.FORMALIZE];
        const refinedText = await this.lm.generate(prompt, {max_new_tokens: 60});
        if (!refinedText) return hypothesis;

        const parsedTerm = parseTerm(refinedText);
        if (!parsedTerm) return hypothesis;

        const refinedHypothesis = new Task(parsedTerm, '.', {...hypothesis.state.truthValue});

        if (this.lm.reasoner && this.lm.memory) {
            const tempMemory = this.lm.memory.clone();
            tempMemory.addTasks([refinedHypothesis]);
            const metaCognition = new MetaCognition();
            const contradictions = metaCognition.findContradictions(tempMemory.getAllTasks());
            if (contradictions.some(c => c.severity > 0.8)) {
                return hypothesis;
            }
        }

        return refinedHypothesis;
    }
}

export default HypothesisGenerator;
