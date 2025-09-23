import {Ollama} from '@langchain/community/llms/ollama';
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
import NLP from './NLP.js';
import {debug, info, warn} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';
import {suppressOnnxWarnings} from '../utils/onnxSuppression.js';
import {configService} from '../config/index.js';

suppressOnnxWarnings();

const errorHandler = createUnifiedErrorHandler('LM');

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering'
};

class LM {
    constructor(configManager) {
        this.config = configService;
        this._pipelineFactory = PipelineFactory;
        this._llm = null;
        this._reasoner = null;
        this._memory = null;
        this._hypothesisGenerator = new HypothesisGenerator(this);
        this._explanationGenerator = new ExplanationGenerator(this._generate.bind(this));
        this._qaService = new QAService(this._generate.bind(this), this._getQAPipeline.bind(this));
        this._planRepairer = new PlanRepairer(this.getGenerationPipeline.bind(this), this._createStructuredChain.bind(this), this._parseStructuredResult.bind(this));
        this._proactiveEnricher = new ProactiveEnricher(this.getGenerationPipeline.bind(this), this._createStructuredChain.bind(this), this._parseStructuredResult.bind(this));
        this.nlp = new NLP();

        this._embeddingQueue = [];
        this._isProcessingEmbeddings = false;
        this._maxConcurrency = this.config.getNumber('LM.EMBEDDING_MAX_CONCURRENCY', 4);
        this._activeEmbeddingJobs = 0;

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
        const batchSize = this.config.getNumber('LM.EMBEDDING_BATCH_SIZE', 10);

        while (this._isProcessingEmbeddings) {
            // Process multiple batches concurrently
            const promises = [];
            for (let i = 0; i < this._maxConcurrency && this._embeddingQueue.length > 0; i++) {
                const batch = this._embeddingQueue.splice(0, batchSize);
                if (batch.length > 0) {
                    promises.push(this._processEmbeddingBatch(batch));
                }
            }

            if (promises.length > 0) {
                await Promise.all(promises);
            }

            // Adjust delay based on queue size
            const delay = this._calculateDynamicDelay();
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

    async getFeaturePipeline() {
        debug('Getting feature extraction pipeline');
        const model = this.config.getString('LM.FEATURE_EXTRACTION_MODEL', 'Xenova/all-MiniLM-L6-v2');
        return this._pipelineFactory.get(PIPELINE_TYPES.FEATURE_EXTRACTION, model);
    }

    async getGenerationPipeline() {
        if (this._llm) return this._llm.pipeline || ((prompt, options) => this._llm.invoke(prompt, options));

        const provider = this.config.getString('LM.LLM_PROVIDER', 'xenova');
        info(`Initializing LLM with provider: ${provider}`);

        if (provider === 'ollama') {
            this._llm = new Ollama({
                model: this.config.getString('LM.TEXT_GENERATION_MODEL', 'Xenova/distilgpt2'),
                baseUrl: this.config.getString('LM.OLLAMA_BASE_URL', 'http://127.0.0.1:11434'),
            });
            return (prompt, options) => this._llm.invoke(prompt, options);
        }

        if (provider === 'xenova') {
            const pipeline = await this._pipelineFactory.get(
                PIPELINE_TYPES.TEXT_GENERATION,
                this.config.getString('LM.TEXT_GENERATION_MODEL', 'Xenova/distilgpt2'), {
                    useCache: false
                }
            );
            this._llm = new XenovaLLM(pipeline);
            return pipeline;
        }

        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    async _getQAPipeline() {
        debug('Getting QA pipeline');
        const model = this.config.getString('LM.QA_MODEL', 'Xenova/distilbert-base-uncased-distilled-squad');
        return this._pipelineFactory.get(PIPELINE_TYPES.QUESTION_ANSWERING, model, {
            maxLength: 512
        });
    }

    async _generate(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }
        return errorHandler.execute(async () => {
            debug('Generating text with prompt length:', prompt.length);
            await this.getGenerationPipeline();
            const result = await this._llm.invoke(prompt, options);
            debug('Text generation completed');
            return result;
        }, 'generate', null);
    }

    _getStructuredOutputParser(outputSchema) {
        return StructuredOutputParser.fromZodSchema(outputSchema);
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
            partialVariables: {
                format_instructions: parser.getFormatInstructions()
            }
        });
        return new LLMChain({
            llm: this._llm,
            prompt,
            ...generationOptions
        });
    }

    _parseStructuredResult(resultText) {
        if (!resultText || typeof resultText !== 'string') {
            return null;
        }
        return errorHandler.executeSync(() => {
            debug('Parsing structured result');
            const match = resultText.match(/```json\n(.*)\n```/s);
            const result = match ? JSON.parse(match[1]) : null;
            if (result) {
                debug('Structured result parsed successfully');
            }
            return result;
        }, 'parseStructuredResult', null);
    }

    async _generateAndAssignEmbedding(term) {
        await errorHandler.execute(async () => {
            debug(`Generating embedding for term: ${term.key}`);
            const extractor = await this.getFeaturePipeline();
            const output = await extractor(term.key, {
                pooling: 'mean',
                normalize: true
            });
            const embeddingVector = Array.from(output.data);
            term.setEmbedding(embeddingVector);
            debug(`Embedding generated and assigned for term: ${term.key}`);
        }, 'generateAndAssignEmbedding');
    }

    async _processEmbeddingBatch(batch) {
        debug(`Processing embedding batch of size ${batch.length}`);
        return Promise.all(batch.map(term => this._generateAndAssignEmbedding(term)));
    }

    async bootstrapTerm(termKey, options = {
        sync: false
    }) {
        if (!termKey) throw new Error('termKey must be a non-empty string.');

        const complexity = termKey.split(/[(&,)/]/).filter(Boolean).length;
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

    _calculateDynamicDelay() {
        // Reduce delay when queue is large, increase when small
        const baseDelay = this.config.getNumber('LM.EMBEDDING_BATCH_DELAY_MS', 100);
        const queueFactor = Math.max(0.1, Math.min(1, this._embeddingQueue.length / 100));
        return baseDelay * (1 - queueFactor * 0.9);
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
