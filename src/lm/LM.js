import Term from '../core/Term.js';
import XenovaLLM from './XenovaLLM.js';
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import config from '../config/index.js';
import HypothesisGenerator from './HypothesisGenerator.js';
import PipelineFactory from './PipelineFactory.js';
import ExplanationGenerator from './ExplanationGenerator.js';
import QAService from './QAService.js';
import PlanRepairer from './PlanRepairer.js';
import ProactiveEnricher from './ProactiveEnricher.js';
import { handleError } from '../utils/error-handler.js';
import { info, error, debug, warn } from '../utils/logger.js';

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering'
};

class LM {
    #pipelineFactory;
    #llm;
    #reasoner;
    #memory;
    #hypothesisGenerator;
    #explanationGenerator;
    #qaService;
    #planRepairer;
    #proactiveEnricher;
    #embeddingQueue;
    #isProcessingEmbeddings;

    constructor() {
        this.#pipelineFactory = PipelineFactory;
        this.#llm = null;
        this.#reasoner = null;
        this.#memory = null;
        this.#hypothesisGenerator = new HypothesisGenerator(this);
        this.#explanationGenerator = new ExplanationGenerator(this.#generate.bind(this));
        this.#qaService = new QAService(this.#generate.bind(this), this.#getQAPipeline.bind(this));
        this.#planRepairer = new PlanRepairer(this.#getGenerationPipeline.bind(this), this.#createStructuredChain.bind(this), this.#parseStructuredResult.bind(this));
        this.#proactiveEnricher = new ProactiveEnricher(this.#getGenerationPipeline.bind(this), this.#createStructuredChain.bind(this), this.#parseStructuredResult.bind(this));

        this.#embeddingQueue = [];
        this.#isProcessingEmbeddings = false;

        info('LM initialized');
    }

    startEmbeddingProcessor() {
        if (this.#isProcessingEmbeddings) {
            warn('Embedding processor is already running.');
            return;
        }
        info('Starting embedding processor.');
        this.#isProcessingEmbeddings = true;
        this.processEmbeddingQueue(); // Fire-and-forget
    }

    stopEmbeddingProcessor() {
        info('Stopping embedding processor.');
        this.#isProcessingEmbeddings = false;
    }

    async processEmbeddingQueue() {
        const batchSize = config.LM.EMBEDDING_BATCH_SIZE;
        const delay = config.LM.EMBEDDING_BATCH_DELAY_MS;

        while (this.#isProcessingEmbeddings) {
            if (this.#embeddingQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const batch = this.#embeddingQueue.splice(0, batchSize);
            debug(`Processing embedding batch of size ${batch.length}`);

            try {
                await Promise.all(batch.map(term => this.#generateAndAssignEmbedding(term)));
            } catch (err) {
                error('Error processing embedding batch:', err);
                // Put items back in the queue for retry? For now, we just log the error.
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
        debug('Embedding processing loop finished.');
    }

    setReasoner(reasoner) {
        this.#reasoner = reasoner;
        debug('Reasoner set for LM');
    }

    setMemory(memory) {
        this.#memory = memory;
        debug('Memory set for LM');
    }

    async #getFeaturePipeline() {
        debug('Getting feature extraction pipeline');
        return this.#pipelineFactory.get(PIPELINE_TYPES.FEATURE_EXTRACTION, config.LM.FEATURE_EXTRACTION_MODEL);
    }

    async #getGenerationPipeline() {
        debug('Getting text generation pipeline');
        const pipeline = await this.#pipelineFactory.get(PIPELINE_TYPES.TEXT_GENERATION, config.LM.TEXT_GENERATION_MODEL, { useCache: false });
        if (!this.#llm) {
            info('Initializing XenovaLLM');
            this.#llm = new XenovaLLM(pipeline);
        }
        return pipeline;
    }

    async #getQAPipeline() {
        debug('Getting QA pipeline');
        return this.#pipelineFactory.get(PIPELINE_TYPES.QUESTION_ANSWERING, config.LM.QA_MODEL, { maxLength: 512 });
    }

    async #generate(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }

        try {
            debug('Generating text with prompt length:', prompt.length);
            await this.#getGenerationPipeline();
            const result = await this.#llm._call(prompt, options);
            debug('Text generation completed');
            return result;
        } catch (err) {
            error('Text generation error:', err);
            return handleError(err, 'Generation error', true);
        }
    }

    #createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        if (!promptTemplate || !outputSchema) {
            throw new Error('Prompt template and output schema are required');
        }

        debug('Creating structured chain');
        const parser = StructuredOutputParser.fromZodSchema(outputSchema);
        const prompt = new PromptTemplate({
            template: `${promptTemplate}\n{format_instructions}\n`,
            inputVariables: ['context'],
            partialVariables: { format_instructions: parser.getFormatInstructions() }
        });
        return new LLMChain({ llm: this.#llm, prompt, ...generationOptions });
    }

    #parseStructuredResult(resultText) {
        if (!resultText || typeof resultText !== 'string') {
            return null;
        }

        try {
            debug('Parsing structured result');
            const match = resultText.match(/```json\n(.*)\n```/s);
            const result = match ? JSON.parse(match[1]) : null;
            if (result) {
                debug('Structured result parsed successfully');
            }
            return result;
        } catch (e) {
            error('Error parsing structured result:', e);
            return null;
        }
    }

    async #generateAndAssignEmbedding(term) {
        try {
            debug(`Generating embedding for term: ${term.key}`);
            const extractor = await this.#getFeaturePipeline();
            const output = await extractor(term.key, { pooling: 'mean', normalize: true });
            const embeddingVector = Array.from(output.data);
            term.setEmbedding(embeddingVector);
            debug(`Embedding generated and assigned for term: ${term.key}`);
        } catch (err) {
            error(`Error generating embedding for term "${term.key}":`, err);
            // In a real-world scenario, we might want to retry or mark the term as failed
        }
    }

    async bootstrapTerm(termKey, options = { sync: false }) {
        return this.#bootstrapTerm(termKey, options);
    }

    async #bootstrapTerm(termKey, options = { sync: false }) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        const term = new Term(termKey, [], complexity);

        if (options.sync) {
            debug(`Bootstrapping term synchronously: ${termKey}`);
            await this.#generateAndAssignEmbedding(term);
        } else {
            debug(`Queueing term for embedding generation: ${termKey}`);
            this.#embeddingQueue.push(term);
        }

        return term;
    }

    async getGenerationPipeline() {
        return this.#getGenerationPipeline();
    }

    createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        return this.#createStructuredChain(promptTemplate, outputSchema, generationOptions);
    }

    parseStructuredResult(resultText) {
        return this.#parseStructuredResult(resultText);
    }

    async generate(prompt, options = {}) {
        return this.#generate(prompt, options);
    }

    async getFeaturePipeline() {
        return this.#getFeaturePipeline();
    }

    async generateHypotheses(tasks, options = {}) {
        debug(`Generating hypotheses for ${tasks.length} tasks`);
        return this.#hypothesisGenerator.generateHypotheses(tasks, options);
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        debug(`Evaluating and ranking ${hypotheses.length} hypotheses`);
        return this.#hypothesisGenerator.evaluateAndRankHypotheses(tasks, hypotheses);
    }

    async refineHypothesis(hypothesis, refinementType) {
        debug(`Refining hypothesis with type: ${refinementType}`);
        return this.#hypothesisGenerator.refineHypothesis(hypothesis, refinementType);
    }

    async explain(termKey, options = {}) {
        return this.#explanationGenerator.explain(termKey, options);
    }

    async answerQuestion(question, context = null) {
        return this.#qaService.answerQuestion(question, context);
    }

    async suggestPlanRepair(goalTask, failedPlan) {
        return this.#planRepairer.suggestPlanRepair(goalTask, failedPlan);
    }

    async proactiveEnrichment(tasks) {
        return this.#proactiveEnricher.proactiveEnrichment(tasks);
    }

    getPipelineStatistics() {
        return {
            pipelineCount: this.#pipelineFactory._pipelines.size
        };
    }

    async dispose() {
        info('Disposing LM resources');
        this.stopEmbeddingProcessor();
        if (this.#pipelineFactory) {
            this.#pipelineFactory.dispose();
        }
        this.#llm = null;
        this.#reasoner = null;
        this.#memory = null;
        info('LM resources disposed');
    }
}

export default LM;
