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
const {handleError, handleErrorWithDefault} = require('../utils/error-handler');
const {info, error, debug, warn} = require('../utils/logger');
const zod = require('zod');

const PIPELINE_TYPES = {
    FEATURE_EXTRACTION: 'feature-extraction',
    TEXT_GENERATION: 'text-generation',
    QUESTION_ANSWERING: 'question-answering',
};

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}-${model}`;
        if (!this._pipelines.has(key)) {
            info(`Loading pipeline: ${type} - ${model}`);
            const {pipeline} = await import('@xenova/transformers');
            this._pipelines.set(key, pipeline(type, model, options));
        }
        return this._pipelines.get(key);
    }

    dispose() {
        info('Disposing all pipelines');
        this._pipelines.clear();
    }
}

class LM {
    constructor() {
        this.pipelineFactory = new PipelineFactory();
        this.llm = null;
        this.reasoner = null;
        this.memory = null;
        this.hypothesisGenerator = new HypothesisGenerator(this);
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
        const {type = 'simple', context = null, promptTemplate = null} = config;
        if (!promptTemplate && (!termKey || typeof termKey !== 'string')) {
            return {error: "Cannot explain an empty term."};
        }

        debug(`Explaining term: ${termKey} with type: ${type}`);
        const finalPrompt = promptTemplate ? promptTemplate : this._getExplanationPrompt(termKey, config);
        const fullPrompt = context ? `Context: ${context}\n${finalPrompt}` : finalPrompt;

        try {
            const explanationText = await this._generate(fullPrompt, {max_new_tokens: 300});
            if (!explanationText) {
                error('Explanation generation failed');
                return {error: `Explanation generation failed.`};
            }
            debug('Explanation generated successfully');
            return {term: termKey, explanation: explanationText};
        } catch (err) {
            error('Error generating explanation:', err);
            return {error: `Failed to generate explanation: ${err.message}`};
        }
    }

    _getExplanationPrompt(termKey, {type, relatedTerms = [], audience = 'intermediate'}) {
        debug(`Getting explanation prompt for: ${termKey}`);
        const prompts = {
            simple: `Explain what "${termKey}" means.`,
            structured: `Provide a structured explanation of "${termKey}" with Definition, Key Components, and Examples.`,
            comparison: `Explain "${termKey}" by comparing it with: ${relatedTerms.join(', ')}.`,
        }
        return prompts[type] || prompts.simple;
    }

    async answerQuestion(question, context = null) {
        if (!question || typeof question !== 'string') {
            return "Cannot answer an empty question.";
        }

        try {
            debug(`Answering question: ${question.substring(0, 50)}...`);
            if (context) {
                const qaPipeline = await this._getQAPipeline();
                const result = await qaPipeline(question, context);
                if (result && result.answer) {
                    debug('Question answered using QA pipeline');
                    return result.answer;
                }
            }

            const prompt = context ? `Context: ${context}\nQuestion: ${question}\nAnswer:` : `Question: ${question}\nAnswer:`;
            const answer = await this._generate(prompt);
            debug('Question answered using generation');
            return answer;
        } catch (err) {
            error('Error answering question:', err);
            return handleErrorWithDefault(err, 'Question answering error', `Failed to answer question: ${err.message}`);
        }
    }

    _createPlanRepairContext(goal, failedPlan) {
        const failedPlanSteps = failedPlan ? failedPlan.map(t => t.key).join(', ') : 'None';
        return `
Goal: ${goal}
Failed Plan: ${failedPlanSteps}
The previous attempt to achieve the goal failed. Please suggest a new sequence of primitive actions to achieve the goal.
The new plan should be a list of Narsese terms.
`;
    }

    async suggestPlanRepair(goalTask, failedPlan) {
        if (!goalTask) throw new Error('Goal task is required');

        try {
            debug(`Suggesting plan repair for goal: ${goalTask.termKey}`);
            await this._getGenerationPipeline();

            const context = this._createPlanRepairContext(goalTask.termKey, failedPlan);
            const chain = this._createStructuredChain(
                context + "New creative plan:",
                zod.object({plan: zod.array(zod.string()).describe("A list of Narsese terms for the new plan.")}),
                {}
            );

            const result = await chain.call({context: ""});
            const parsed = this._parseStructuredResult(result.text);

            if (!parsed || !parsed.plan) {
                warn('Plan repair suggestion failed to parse');
                return null;
            }

            const planTerms = parsed.plan.map(termKey => parseTerm(termKey)).filter(Boolean);
            debug(`Plan repair suggested ${planTerms.length} terms`);
            return planTerms;
        } catch (err) {
            error('Error in plan repair suggestion:', err);
            return handleErrorWithDefault(err, 'Plan repair error', null);
        }
    }

    _createProactiveEnrichmentContext(tasks) {
        const newBeliefs = Task.getBeliefTasks(tasks).filter(t => t.state.truthValue.confidence > 0.8);
        if (newBeliefs.length === 0) return null;

        debug(`Found ${newBeliefs.length} high-confidence beliefs for enrichment`);
        return "Given the following new beliefs:\n" + newBeliefs.map(t => t.termKey).join('\n');
    }

    async proactiveEnrichment(tasks) {
        if (!tasks || tasks.length === 0) {
            debug('No tasks for proactive enrichment');
            return [];
        }

        try {
            debug(`Performing proactive enrichment on ${tasks.length} tasks`);
            await this._getGenerationPipeline();

            const context = this._createProactiveEnrichmentContext(tasks);
            if (!context) {
                debug('No high-confidence beliefs for enrichment');
                return [];
            }

            const prompt = context + "\n\nWhat are some interesting implications or related concepts? Generate new knowledge in Narsese format.";
            const chain = this._createStructuredChain(
                prompt,
                zod.object({new_knowledge: zod.array(zod.string()).describe("A list of new Narsese statements.")}),
                {}
            );

            const result = await chain.call({context: ""});
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
        } catch (err) {
            error('Error in proactive enrichment:', err);
            return handleErrorWithDefault(err, 'Proactive enrichment error', []);
        }
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
