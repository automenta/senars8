import {Ollama} from '@langchain/community/llms/ollama';
import {suppressOnnxWarnings} from '../utils/onnxSuppression.js';
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
import {debug, error, info, warn} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('LM');

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering'
};

class LM {
    constructor(configManager) {
        this.configManager = configManager;
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

        info('LM initialized', { module: 'lm/LM' });
    }

    startEmbeddingProcessor() {
        if (this._isProcessingEmbeddings) {
            warn('Embedding processor is already running.', { module: 'lm/LM' });
            return;
        }
        info('Starting embedding processor.', { module: 'lm/LM' });
        this._isProcessingEmbeddings = true;
        this.processEmbeddingQueue();
    }

    stopEmbeddingProcessor() {
        info('Stopping embedding processor.', { module: 'lm/LM' });
        this._isProcessingEmbeddings = false;
    }

    async processEmbeddingQueue() {
        const batchSize = this.configManager.getNumber('LM.EMBEDDING_BATCH_SIZE', 10);
        const delay = this.configManager.getNumber('LM.EMBEDDING_BATCH_DELAY_MS', 100);

        while (this._isProcessingEmbeddings) {
            if (this._embeddingQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            const batch = this._embeddingQueue.splice(0, batchSize);
            debug(`Processing embedding batch of size ${batch.length}`, { module: 'lm/LM' });

            await errorHandler.safeAsync(
                () => Promise.all(batch.map(term => this._generateAndAssignEmbedding(term))),
                'processEmbeddingQueue'
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
        debug('Embedding processing loop finished.', { module: 'lm/LM' });
    }

    setReasoner(reasoner) {
        this._reasoner = reasoner;
        debug('Reasoner set for LM', { module: 'lm/LM' });
    }

    setMemory(memory) {
        this._memory = memory;
        debug('Memory set for LM', { module: 'lm/LM' });
    }

    async _getFeaturePipeline() {
        debug('Getting feature extraction pipeline', { module: 'lm/LM' });
        const model = this.configManager.getString('LM.FEATURE_EXTRACTION_MODEL', 'Xenova/all-MiniLM-L6-v2');
        return this._pipelineFactory.get(PIPELINE_TYPES.FEATURE_EXTRACTION, model);
    }

    async _getGenerationPipeline() {
        if (this._llm) {
            if (this.configManager.getString('LM.LLM_PROVIDER') === 'ollama') {
                return (prompt, options) => this._llm.invoke(prompt, options);
            }
            return this._llm.pipeline;
        }

        const provider = this.configManager.getString('LM.LLM_PROVIDER', 'xenova');
        info(`Initializing LLM with provider: ${provider}`, { module: 'lm/LM' });

        switch (provider) {
            case 'ollama': {
                this._llm = new Ollama({
                    model: this.configManager.getString('LM.TEXT_GENERATION_MODEL', 'Xenova/distilgpt2'),
                    baseUrl: this.configManager.getString('LM.OLLAMA_BASE_URL', 'http://127.0.0.1:11434'),
                });
                return (prompt, options) => this._llm.invoke(prompt, options);
            }
            case 'xenova': {
                suppressOnnxWarnings();
                const pipeline = await this._pipelineFactory.get(
                    PIPELINE_TYPES.TEXT_GENERATION,
                    this.configManager.getString('LM.TEXT_GENERATION_MODEL', 'Xenova/distilgpt2'), {
                        useCache: false
                    }
                );
                this._llm = new XenovaLLM(pipeline);
                return pipeline;
            }
            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }
    }

    async _getQAPipeline() {
        debug('Getting QA pipeline', { module: 'lm/LM' });
        const model = this.configManager.getString('LM.QA_MODEL', 'Xenova/distilbert-base-uncased-distilled-squad');
        return this._pipelineFactory.get(PIPELINE_TYPES.QUESTION_ANSWERING, model, {
            maxLength: this.configManager.getNumber('LM.QA_MODEL_MAX_LENGTH', 512)
        });
    }

    async _generate(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }
        return errorHandler.safeAsync(async () => {
            debug('Generating text with prompt length:', prompt.length);
            await this._getGenerationPipeline();
            const result = await this._llm.invoke(prompt, options);
            debug('Text generation completed', { module: 'lm/LM' });
            return result;
        }, 'generate', null);
    }

    _createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        if (!promptTemplate || !outputSchema) {
            throw new Error('Prompt template and output schema are required');
        }
        debug('Creating structured chain', { module: 'lm/LM' });
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
        return errorHandler.safeSync(() => {
            debug('Parsing structured result', { module: 'lm/LM' });
            const match = resultText.match(/```json\n(.*)\n```/s);
            const result = match ? JSON.parse(match[1]) : null;
            if (result) {
                debug('Structured result parsed successfully', { module: 'lm/LM' });
            }
            return result;
        }, 'parseStructuredResult', null);
    }

    async _generateAndAssignEmbedding(term) {
        await errorHandler.safeAsync(async () => {
            debug(`Generating embedding for term: ${term.key}`, { module: 'lm/LM' });
            const extractor = await this._getFeaturePipeline();
            const output = await extractor(term.key, {
                pooling: 'mean',
                normalize: true
            });
            const embeddingVector = Array.from(output.data);
            term.setEmbedding(embeddingVector);
            debug(`Embedding generated and assigned for term: ${term.key}`, { module: 'lm/LM' });
        }, 'generateAndAssignEmbedding');
    }

    async bootstrapTerm(termKey, options = {
        sync: false
    }) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        const term = new Term(termKey, [], complexity);

        if (options.sync) {
            debug(`Bootstrapping term synchronously: ${termKey}`, { module: 'lm/LM' });
            await this._generateAndAssignEmbedding(term);
        } else {
            debug(`Queueing term for embedding generation: ${termKey}`, { module: 'lm/LM' });
            this._embeddingQueue.push(term);
        }

        return term;
    }

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

    async generateHypotheses(tasks, options = {}) {
        debug(`Generating hypotheses for ${tasks.length} tasks`, { module: 'lm/LM' });
        return this._hypothesisGenerator.generateHypotheses(tasks, options);
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        debug(`Evaluating and ranking ${hypotheses.length} hypotheses`, { module: 'lm/LM' });
        return this._hypothesisGenerator.evaluateAndRankHypotheses(tasks, hypotheses);
    }

    async refineHypothesis(hypothesis, refinementType) {
        debug(`Refining hypothesis with type: ${refinementType}`, { module: 'lm/LM' });
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
        info('Disposing LM resources', { module: 'lm/LM' });
        this.stopEmbeddingProcessor();
        if (this._pipelineFactory) {
            this._pipelineFactory.dispose();
        }
        this._llm = null;
        this._reasoner = null;
        this._memory = null;
        info('LM resources disposed', { module: 'lm/LM' });
    }
}

export default LM;
