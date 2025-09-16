import Term from '../core/Term.js';
import XenovaLLM from './XenovaLLM.js';
import {LLMChain} from 'langchain/chains';
import {PromptTemplate} from '@langchain/core/prompts';
import {StructuredOutputParser} from '@langchain/core/output_parsers';
import HypothesisGenerator from './HypothesisGenerator.js';
import PipelineFactory from './PipelineFactory.js';
import ExplanationGenerator from './ExplanationGenerator.js';
import QAService from './QAService.js';
import PlanRepairer from './PlanRepairer.js';
import ProactiveEnricher from './ProactiveEnricher.js';
import {handleError} from '../utils/error-handler.js';
import {debug, error, info, warn} from '../utils/logger.js';
import defaultConfig from '../config/default-config.js';

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering'
};

class LM {
    constructor(config = defaultConfig.LM) {
        this.config = config;
        this._pipelineFactory = PipelineFactory;
        this._llm = null;
        this._reasoner = null;
        this._memory = null;
        this._hypothesisGenerator = new HypothesisGenerator(this);
        this._explanationGenerator = new ExplanationGenerator(this._generate.bind(this));
        this._qaService = new QAService(this._generate.bind(this), this._getQAPipeline.bind(this));
        this._planRepairer = new PlanRepairer(this._getGenerationPipeline.bind(this), this._createStructuredChain.bind(this), this._parseStructuredResult.bind(this));
        this._proactiveEnricher = new ProactiveEnricher(this._getGenerationPipeline.bind(this), this._createStructuredChain.bind(this), this._parseStructuredResult.bind(this));

        this._embeddingQueue = [];
        this._isProcessingEmbeddings = false;

        info('LM initialized');
    }

    startEmbeddingProcessor() {
        if (this._isProcessingEmbeddings) {
            warn('Embedding processor is already running.');
            return;
        }
        info('Starting embedding processor.');
        this._isProcessingEmbeddings = true;
        this.processEmbeddingQueue();
    }

    stopEmbeddingProcessor() {
        info('Stopping embedding processor.');
        this._isProcessingEmbeddings = false;
    }

    async processEmbeddingQueue() {
        const batchSize = this.config.EMBEDDING_BATCH_SIZE;
        const delay = this.config.EMBEDDING_BATCH_DELAY_MS;

        while (this._isProcessingEmbeddings) {
            if (this._embeddingQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const batch = this._embeddingQueue.splice(0, batchSize);
            debug(`Processing embedding batch of size ${batch.length}`);

            try {
                await Promise.all(batch.map(term => this._generateAndAssignEmbedding(term)));
            } catch (err) {
                error('Error processing embedding batch:', err);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
        debug('Embedding processing loop finished.');
    }

    setReasoner(reasoner) {
        this._reasoner = reasoner;
        debug('Reasoner set for LM');
    }

    setMemory(memory) {
        this._memory = memory;
        debug('Memory set for LM');
    }

    async _getFeaturePipeline() {
        debug('Getting feature extraction pipeline');
        return this._pipelineFactory.get(PIPELINE_TYPES.FEATURE_EXTRACTION, this.config.FEATURE_EXTRACTION_MODEL);
    }

    async _getGenerationPipeline() {
        debug('Getting text generation pipeline');
        const pipeline = await this._pipelineFactory.get(PIPELINE_TYPES.TEXT_GENERATION, this.config.TEXT_GENERATION_MODEL, {useCache: false});
        if (!this._llm) {
            info('Initializing XenovaLLM');
            this._llm = new XenovaLLM(pipeline);
        }
        return pipeline;
    }

    async _getQAPipeline() {
        debug('Getting QA pipeline');
        return this._pipelineFactory.get(PIPELINE_TYPES.QUESTION_ANSWERING, this.config.QA_MODEL, {maxLength: 512});
    }

    async _generate(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }
        try {
            debug('Generating text with prompt length:', prompt.length);
            await this._getGenerationPipeline();
            const result = await this._llm._call(prompt, options);
            debug('Text generation completed');
            return result;
        } catch (err) {
            error('Text generation error:', err);
            return handleError(err, 'Generation error', true);
        }
    }

    _createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        if (!promptTemplate || !outputSchema) {
            throw new Error('Prompt template and output schema are required');
        }
        debug('Creating structured chain');
        const parser = StructuredOutputParser.fromZodSchema(outputSchema);
        const prompt = new PromptTemplate({
            template: `${promptTemplate}\n{format_instructions}\n`,
            inputVariables: ['context'],
            partialVariables: {format_instructions: parser.getFormatInstructions()}
        });
        return new LLMChain({llm: this._llm, prompt, ...generationOptions});
    }

    _parseStructuredResult(resultText) {
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

    async _generateAndAssignEmbedding(term) {
        try {
            debug(`Generating embedding for term: ${term.key}`);
            const extractor = await this._getFeaturePipeline();
            const output = await extractor(term.key, {pooling: 'mean', normalize: true});
            const embeddingVector = Array.from(output.data);
            term.setEmbedding(embeddingVector);
            debug(`Embedding generated and assigned for term: ${term.key}`);
        } catch (err) {
            error(`Error generating embedding for term "${term.key}":`, err);
        }
    }

    async bootstrapTerm(termKey, options = {sync: false}) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        const term = new Term(termKey, [], complexity);

        if (options.sync) {
            debug(`Bootstrapping term synchronously: ${termKey}`);
            await this._generateAndAssignEmbedding(term);
        } else {
            debug(`Queueing term for embedding generation: ${termKey}`);
            this._embeddingQueue.push(term);
        }

        return term;
    }

    // --- Public API for sub-modules ---

    getGenerationPipeline() {
        return this._getGenerationPipeline();
    }

    getFeaturePipeline() {
        return this._getFeaturePipeline();
    }

    createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        return this._createStructuredChain(promptTemplate, outputSchema, generationOptions);
    }

    parseStructuredResult(resultText) {
        return this._parseStructuredResult(resultText);
    }

    generate(prompt, options = {}) {
        return this._generate(prompt, options);
    }

    // --- Public API for System ---

    async generateHypotheses(tasks, options = {}) {
        debug(`Generating hypotheses for ${tasks.length} tasks`);
        return this._hypothesisGenerator.generateHypotheses(tasks, options);
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        debug(`Evaluating and ranking ${hypotheses.length} hypotheses`);
        return this._hypothesisGenerator.evaluateAndRankHypotheses(tasks, hypotheses);
    }

    async refineHypothesis(hypothesis, refinementType) {
        debug(`Refining hypothesis with type: ${refinementType}`);
        return this._hypothesisGenerator.refineHypothesis(hypothesis, refinementType);
    }

    async explain(termKey, options = {}) {
        return this._explanationGenerator.explain(termKey, options);
    }

    async answerQuestion(question, context = null) {
        return this._qaService.answerQuestion(question, context);
    }

    async suggestPlanRepair(goalTask, failedPlan) {
        return this._planRepairer.suggestPlanRepair(goalTask, failedPlan);
    }

    async proactiveEnrichment(tasks) {
        return this._proactiveEnricher.proactiveEnrichment(tasks);
    }

    getPipelineStatistics() {
        return {
            pipelineCount: this._pipelineFactory._pipelines.size
        };
    }

    async dispose() {
        info('Disposing LM resources');
        this.stopEmbeddingProcessor();
        if (this._pipelineFactory) {
            this._pipelineFactory.dispose();
        }
        this._llm = null;
        this._reasoner = null;
        this._memory = null;
        info('LM resources disposed');
    }
}

export default LM;
