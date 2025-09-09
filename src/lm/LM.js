const Term = require("../core/Term");
const Task = require("../core/Task");
const XenovaLLM = require("./XenovaLLM");
const {parseTerm} = require('../parser/narseseParser');
const {cosineSimilarity} = require('../utils/math');
const {LLMChain} = require("langchain/chains");
const {PromptTemplate} = require("@langchain/core/prompts");
const {StructuredOutputParser} = require("@langchain/core/output_parsers");
const {LM: LM_CONFIG} = require('../config');
const HypothesisGenerator = require('./HypothesisGenerator');
const PipelineFactory = require('./PipelineFactory');
const ExplanationGenerator = require('./ExplanationGenerator');
const QAService = require('./QAService');
const PlanRepairer = require('./PlanRepairer');
const ProactiveEnricher = require('./ProactiveEnricher');
const {handleError, handleErrorWithDefault} = require('../utils/error-handler');
const {info, error, debug, warn} = require('../utils/logger');
const zod = require('zod');

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering',
};

class LM {
    constructor() {
        this.pipelineFactory = new PipelineFactory();
        this.llm = null;
        this.reasoner = null;
        this.memory = null;
        this.hypothesisGenerator = new HypothesisGenerator(this);
        this.explanationGenerator = new ExplanationGenerator(this._generate.bind(this));
        this.qaService = new QAService(this._generate.bind(this), this._getQAPipeline.bind(this));
        this.planRepairer = new PlanRepairer(this._getGenerationPipeline.bind(this), this._createStructuredChain.bind(this), this._parseStructuredResult.bind(this));
        this.proactiveEnricher = new ProactiveEnricher(this._getGenerationPipeline.bind(this), this._createStructuredChain.bind(this), this._parseStructuredResult.bind(this));
        info('LM initialized');
    }

    setReasoner(reasoner) {
        this.reasoner = reasoner;
        debug('Reasoner set for LM');
    }

    setMemory(memory) {
        this.memory = memory;
        debug('Memory set for LM');
    }

    async _getFeaturePipeline() {
        debug('Getting feature extraction pipeline');
        return this.pipelineFactory.get(PIPELINE_TYPES.FEATURE_EXTRACTION, LM_CONFIG.FEATURE_EXTRACTION_MODEL);
    }

    async _getGenerationPipeline() {
        debug('Getting text generation pipeline');
        const pipeline = await this.pipelineFactory.get(PIPELINE_TYPES.TEXT_GENERATION, LM_CONFIG.TEXT_GENERATION_MODEL, {useCache: false});
        if (!this.llm) {
            info('Initializing XenovaLLM');
            this.llm = new XenovaLLM(pipeline);
        }
        return pipeline;
    }

    async _getQAPipeline() {
        debug('Getting QA pipeline');
        return this.pipelineFactory.get(PIPELINE_TYPES.QUESTION_ANSWERING, LM_CONFIG.QA_MODEL, {maxLength: 512});
    }

    async _generate(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }

        try {
            debug('Generating text with prompt length:', prompt.length);
            await this._getGenerationPipeline();
            const result = await this.llm._call(prompt, options);
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
            inputVariables: ["context"],
            partialVariables: {format_instructions: parser.getFormatInstructions()},
        });
        return new LLMChain({llm: this.llm, prompt, ...generationOptions});
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

    async bootstrapTerm(termKey) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        try {
            debug(`Bootstrapping term: ${termKey}`);
            const extractor = await this._getFeaturePipeline();
            const output = await extractor(termKey, {pooling: 'mean', normalize: true});
            const embeddingVector = Array.from(output.data);
            const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
            const term = new Term(termKey, embeddingVector, complexity);
            debug(`Term bootstrapped successfully: ${termKey}`);
            return term;
        } catch (err) {
            error(`Error bootstrapping term "${termKey}":`, err);
            return handleError(err, `Failed to bootstrap term "${termKey}"`, true);
        }
    }

    async generateHypotheses(tasks, config = {}) {
        debug(`Generating hypotheses for ${tasks.length} tasks`);
        return this.hypothesisGenerator.generateHypotheses(tasks, config);
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        debug(`Evaluating and ranking ${hypotheses.length} hypotheses`);
        return this.hypothesisGenerator.evaluateAndRankHypotheses(tasks, hypotheses);
    }

    async refineHypothesis(hypothesis, refinementType) {
        debug(`Refining hypothesis with type: ${refinementType}`);
        return this.hypothesisGenerator.refineHypothesis(hypothesis, refinementType);
    }

    async explain(termKey, config = {}) {
        return this.explanationGenerator.explain(termKey, config);
    }

    async answerQuestion(question, context = null) {
        return this.qaService.answerQuestion(question, context);
    }

    async suggestPlanRepair(goalTask, failedPlan) {
        return this.planRepairer.suggestPlanRepair(goalTask, failedPlan);
    }

    async proactiveEnrichment(tasks) {
        return this.proactiveEnricher.proactiveEnrichment(tasks);
    }

    getPipelineStatistics() {
        return {
            pipelineCount: this.pipelineFactory._pipelines.size
        };
    }

    async dispose() {
        info('Disposing LM resources');
        if (this.pipelineFactory) {
            this.pipelineFactory.dispose();
        }
        this.llm = null;
        this.reasoner = null;
        this.memory = null;
        info('LM resources disposed');
    }
}

module.exports = LM;
