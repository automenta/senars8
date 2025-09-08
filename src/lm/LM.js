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

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}-${model}`;
        if (!this._pipelines.has(key)) {
            const {pipeline} = await import('@xenova/transformers');
            this._pipelines.set(key, pipeline(type, model, options));
        }
        return this._pipelines.get(key);
    }
    
    async dispose() {
        // Clear all pipelines to free up memory
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
    }

    setReasoner(reasoner) {
        this.reasoner = reasoner;
    }

    setMemory(memory) {
        this.memory = memory;
    }

    // Pipeline management methods
    async _getFeaturePipeline() {
        return this.pipelineFactory.get('feature-extraction', LM_CONFIG.FEATURE_EXTRACTION_MODEL);
    }

    async _getGenerationPipeline() {
        const pipeline = await this.pipelineFactory.get('text-generation', LM_CONFIG.TEXT_GENERATION_MODEL, {useCache: false});
        if (!this.llm) {
            this.llm = new XenovaLLM(pipeline);
        }
        return pipeline;
    }

    async _getQAPipeline() {
        return this.pipelineFactory.get('question-answering', LM_CONFIG.QA_MODEL, {maxLength: 512});
    }

    // Core generation methods
    async _generate(prompt, options = {}) {
        if (!prompt || typeof prompt !== 'string') {
            throw new Error('Prompt must be a non-empty string');
        }
        
        try {
            await this._getGenerationPipeline();
            return this.llm._call(prompt, options);
        } catch (error) {
            console.error('Generation error:', error);
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    _createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        if (!promptTemplate || !outputSchema) {
            throw new Error('Prompt template and output schema are required');
        }
        
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
            const match = resultText.match(/```json\n(.*)\n```/s);
            return match ? JSON.parse(match[1]) : null;
        } catch (e) {
            console.warn('Failed to parse structured result:', e.message);
            return null;
        }
    }

    // Term management methods
    async bootstrapTerm(termKey) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }
        
        try {
            const extractor = await this._getFeaturePipeline();
            const output = await extractor(termKey, {pooling: 'mean', normalize: true});
            const embeddingVector = Array.from(output.data);
            const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
            return new Term(termKey, embeddingVector, complexity);
        } catch (error) {
            console.error(`Failed to bootstrap term "${termKey}":`, error);
            throw new Error(`Failed to bootstrap term: ${error.message}`);
        }
    }

    // Hypothesis generation methods (delegated to HypothesisGenerator)
    async generateHypotheses(tasks, config = {}) {
        return this.hypothesisGenerator.generateHypotheses(tasks, config);
    }

    async generateHypothesis(task, config = {}) {
        return this.hypothesisGenerator.generateHypothesis(task, config);
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        return this.hypothesisGenerator.evaluateAndRankHypotheses(tasks, hypotheses);
    }

    async refineHypothesis(hypothesis, refinementType) {
        return this.hypothesisGenerator.refineHypothesis(hypothesis, refinementType);
    }

    // Explanation methods
    async explain(termKey, config = {}) {
        const {type = 'simple', context = null, promptTemplate = null} = config;
        if (!promptTemplate && (!termKey || typeof termKey !== 'string')) {
            return {error: "Cannot explain an empty term."};
        }

        const finalPrompt = promptTemplate ? promptTemplate : this._getExplanationPrompt(termKey, config);
        const fullPrompt = context ? `Context: ${context}\n${finalPrompt}` : finalPrompt;

        try {
            const explanationText = await this._generate(fullPrompt, {max_new_tokens: 300});
            if (!explanationText) {
                return {error: `Explanation generation failed.`};
            }
            return {term: termKey, explanation: explanationText};
        } catch (error) {
            return {error: `Failed to generate explanation: ${error.message}`};
        }
    }

    _getExplanationPrompt(termKey, {type, relatedTerms = [], audience = 'intermediate'}) {
        const prompts = {
            simple: `Explain what "${termKey}" means.`,
            structured: `Provide a structured explanation of "${termKey}" with Definition, Key Components, and Examples.`,
            comparison: `Explain "${termKey}" by comparing it with: ${relatedTerms.join(', ')}.`,
        }
        return prompts[type] || prompts.simple;
    }

    // Question answering methods
    async answerQuestion(question, context = null) {
        if (!question || typeof question !== 'string') {
            return "Cannot answer an empty question.";
        }
        
        try {
            if (context) {
                const qaPipeline = await this._getQAPipeline();
                const result = await qaPipeline(question, context);
                if (result && result.answer) {
                    return result.answer;
                }
            }
            
            const prompt = context ? `Context: ${context}\nQuestion: ${question}\nAnswer:` : `Question: ${question}\nAnswer:`;
            return await this._generate(prompt);
        } catch (error) {
            console.error('Question answering error:', error);
            return `Failed to answer question: ${error.message}`;
        }
    }

    // Planning methods
    async suggestPlanRepair(goalTask, failedPlan) {
        if (!goalTask) {
            throw new Error('Goal task is required');
        }
        
        try {
            await this._getGenerationPipeline();

            const goal = goalTask.termKey;
            const failedPlanSteps = failedPlan ? failedPlan.map(t => t.key).join(', ') : 'None';

            const context = `
Goal: ${goal}
Failed Plan: ${failedPlanSteps}
The previous attempt to achieve the goal failed. Please suggest a new sequence of primitive actions to achieve the goal.
The new plan should be a list of Narsese terms.
`;

            const chain = this._createStructuredChain(
                context + "New creative plan:",
                require('zod').object({plan: require('zod').array(require('zod').string()).describe("A list of Narsese terms for the new plan.")}),
                {}
            );

            const result = await chain.call({context: ""}); // context is already in the prompt template
            const parsed = this._parseStructuredResult(result.text);

            if (!parsed || !parsed.plan) {
                return null;
            }

            const planTerms = parsed.plan.map(termKey => parseTerm(termKey)).filter(Boolean);
            return planTerms;
        } catch (error) {
            console.error('Plan repair error:', error);
            return null;
        }
    }

    // Proactive enrichment methods
    async proactiveEnrichment(tasks) {
        if (!tasks || tasks.length === 0) return [];
        
        try {
            await this._getGenerationPipeline();

            const newBeliefs = tasks.filter(t => t.punctuation === '.' && t.state.truthValue.confidence > 0.8);
            if (newBeliefs.length === 0) return [];

            const context = "Given the following new beliefs:\n" + newBeliefs.map(t => t.termKey).join('\n');
            const prompt = context + "\n\nWhat are some interesting implications or related concepts? Generate new knowledge in Narsese format.";

            const chain = this._createStructuredChain(
                prompt,
                require('zod').object({new_knowledge: require('zod').array(require('zod').string()).describe("A list of new Narsese statements.")}),
                {}
            );

            const result = await chain.call({context: ""});
            const parsed = this._parseStructuredResult(result.text);

            if (!parsed || !parsed.new_knowledge) {
                return [];
            }

            const newTasks = parsed.new_knowledge.map(termKey => {
                const parsedTerm = parseTerm(termKey);
                return parsedTerm ? new Task(parsedTerm, '.', {confidence: 0.6, frequency: 0.5}) : null;
            }).filter(Boolean);

            return newTasks;
        } catch (error) {
            console.error('Proactive enrichment error:', error);
            return [];
        }
    }
    
    // Cleanup method
    async dispose() {
        if (this.pipelineFactory) {
            await this.pipelineFactory.dispose();
        }
        this.llm = null;
        this.reasoner = null;
        this.memory = null;
    }
}

module.exports = LM;
