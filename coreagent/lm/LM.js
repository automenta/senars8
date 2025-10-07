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
import {configService} from '../config/index.js';
import {SystemCommands} from '../system/SystemCommands.js';
import {SystemEvents} from '../system/SystemEvents.js';

const errorHandler = createUnifiedErrorHandler('LM');

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering'
};

class LM {
    constructor(_configManager, commandBus, eventBus, metricsService = null) {
        this.config = configService;
        this.commandBus = commandBus;
        this.eventBus = eventBus;
        this.metricsService = metricsService;
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

        // Register command handlers
        this.commandBus.handle(SystemCommands.LM_BOOTSTRAP_TERM, ({
                                                                      termKey,
                                                                      options
                                                                  }) => this.bootstrapTerm(termKey, options));
        this.commandBus.handle(SystemCommands.LM_ENRICH_TERM, (task) => this.proactiveEnrichment([task]));
        this.commandBus.handle(SystemCommands.LM_NLP_PARSE, (payload) => this.nlp.parse(payload));
        this.commandBus.handle(SystemCommands.LM_GENERATE_HYPOTHESES, (payload) => this.generateHypotheses(payload.tasks, payload.options));
        this.commandBus.handle(SystemCommands.LM_EXPLAIN, (payload) => this.explain(payload.termKey, payload.options));
        this.commandBus.handle(SystemCommands.LM_EVALUATE_AND_RANK_HYPOTHESES, (payload) => this.evaluateAndRankHypotheses(payload.tasks, payload.hypotheses));

        // Register event listeners
        this.eventBus.on(SystemEvents.SYSTEM_START, () => this.startEmbeddingProcessor());
        this.eventBus.on(SystemEvents.SYSTEM_STOP, () => this.stopEmbeddingProcessor());
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
            await this._processConcurrentBatches(batchSize);

            // Adjust delay based on queue size
            const delay = this._calculateDynamicDelay();
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        debug('Embedding processing loop finished.');
    }

    async _processConcurrentBatches(batchSize) {
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
            try {
                const pipeline = await this._pipelineFactory.get(
                    PIPELINE_TYPES.TEXT_GENERATION,
                    this.config.getString('LM.TEXT_GENERATION_MODEL', 'Xenova/distilgpt2'), {
                        useCache: false
                    }
                );
                this._llm = new XenovaLLM(pipeline);
                return pipeline;
            } catch (error) {
                // If Xenova fails due to ONNX runtime issues, warn and potentially fall back
                if (error.code === 'ERR_DLOPEN_FAILED' && error.message.includes('did not self-register')) {
                    warn(`ONNX runtime failed to load for Xenova provider: ${error.message}. Consider switching providers in config.`);
                    
                    // Optionally try to initialize Ollama as fallback
                    try {
                        info('Attempting fallback to Ollama provider...');
                        this._llm = new Ollama({
                            model: this.config.getString('LM.TEXT_GENERATION_MODEL', 'Xenova/distilgpt2'),
                            baseUrl: this.config.getString('LM.OLLAMA_BASE_URL', 'http://127.0.0.1:11434'),
                        });
                        return (prompt, options) => this._llm.invoke(prompt, options);
                    } catch (fallbackError) {
                        warn(`Fallback to Ollama also failed: ${fallbackError.message}`);
                        // Check if it's a fetch error - if so, we can still return the Ollama instance but it will fail on use
                        if (fallbackError.message.includes('fetch failed')) {
                            // Still set the Ollama instance, but warn that it's not accessible
                            warn('Ollama provider configured but server may not be accessible');
                        } else {
                            // For other errors, re-throw the original error
                            throw error;
                        }
                    }
                }
                // Re-throw other errors
                throw error;
            }
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
        
        debug('Generating text with prompt length:', prompt.length);
        try {
            await this.getGenerationPipeline();
            const result = await this._llm.invoke(prompt, options);
            debug('Text generation completed');
            return result;
        } catch (error) {
            if (error.message.includes('fetch failed')) {
                // Suppress fetch errors - just return null when Ollama is unavailable
                return null;
            }
            if (error.code === 'ERR_DLOPEN_FAILED' && error.message.includes('did not self-register')) {
                // Suppress ONNX runtime errors - just return null when transformers unavailable
                return null;
            }
            // Re-throw other errors so they can be handled by calling code
            throw error;
        }
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
        const startTime = Date.now();
        let success = false;
        
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
            success = true;
        }, 'generateAndAssignEmbedding');
        
        const executionTime = Date.now() - startTime;
        
        // Track in metrics service if available
        if (this.metricsService) {
            this.metricsService.trackEmbeddingGeneration(success, executionTime);
        }
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
        const term = new Term(termKey, null, complexity); // Pass null instead of creating a new empty array

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
        const startTime = Date.now();
        let success = false;
        let result;
        
        try {
            debug(`Generating hypotheses for ${tasks.length} tasks`);
            result = await this._hypothesisGenerator.generateHypotheses(tasks, options);
            success = true;
        } catch (error) {
            debug(`Hypothesis generation failed: ${error.message}`);
        } finally {
            const executionTime = Date.now() - startTime;
            
            // Track in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackHypothesisGeneration(success, executionTime);
            }
        }
        
        return result;
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        const startTime = Date.now();
        let success = false;
        let result;
        
        try {
            debug(`Evaluating and ranking ${hypotheses.length} hypotheses`);
            result = await this._hypothesisGenerator.evaluateAndRankHypotheses(tasks, hypotheses);
            success = true;
        } catch (error) {
            debug(`Hypothesis evaluation and ranking failed: ${error.message}`);
        } finally {
            const executionTime = Date.now() - startTime;
            
            // Track in metrics service if available
            if (this.metricsService) {
                this.metricsService.trackHypothesisGeneration(success, executionTime); // Reuse the same metric for now
            }
        }
        
        return result;
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

    async generate(prompt, options = {}) {
        // Public generate method that handles LLM unavailability gracefully
        try {
            return await this._generate(prompt, options);
        } catch (error) {
            // Return null if LLM is unavailable
            return null;
        }
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
        const minDelay = Math.max(10, baseDelay * 0.1); // Ensure minimum delay to prevent high CPU usage
        const queueFactor = Math.max(0.1, Math.min(1, this._embeddingQueue.length / 100));
        const calculatedDelay = baseDelay * (1 - queueFactor * 0.9);
        return Math.max(minDelay, calculatedDelay); // Ensure delay doesn't go too low
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
        this._embeddingQueue = []; // Clear the queue to release references
        info('LM resources disposed');
    }
}

export default LM;
