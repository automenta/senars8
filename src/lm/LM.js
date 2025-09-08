const Term = require("../core/Term");
const Task = require("../core/Task");
const XenovaLLM = require("./XenovaLLM");
const { parseTerm } = require('../parser/narseseParser');
const { cosineSimilarity } = require('../utils/math');
const { LLMChain } = require("langchain/chains");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { LM: LM_CONFIG } = require('../config');

const HYPOTHESIS_TYPES = {
    GENERAL: 'general',
    CREATIVE: 'creative',
    GOAL_ORIENTED: 'goal_oriented',
};

const REFINEMENT_TYPES = {
    FORMALIZE: 'formalize',
    SIMPLIFY: 'simplify',
};

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}-${model}`;
        if (!this._pipelines.has(key)) {
            const { pipeline } = await import('@xenova/transformers');
            this._pipelines.set(key, pipeline(type, model, options));
        }
        return this._pipelines.get(key);
    }
}

class LM {
    constructor() {
        this.pipelineFactory = new PipelineFactory();
        this.llm = null;
        this.reasoner = null;
        this.memory = null;
    }

    setReasoner(reasoner) {
        this.reasoner = reasoner;
    }

    setMemory(memory) {
        this.memory = memory;
    }

    async _getFeaturePipeline() {
        return this.pipelineFactory.get('feature-extraction', LM_CONFIG.FEATURE_EXTRACTION_MODEL);
    }

    async _getGenerationPipeline() {
        const pipeline = await this.pipelineFactory.get('text-generation', LM_CONFIG.TEXT_GENERATION_MODEL, { useCache: false });
        if (!this.llm) {
            this.llm = new XenovaLLM(pipeline);
        }
        return pipeline;
    }

    async _getQAPipeline() {
        return this.pipelineFactory.get('question-answering', LM_CONFIG.QA_MODEL, { maxLength: 512 });
    }

    async _generate(prompt, options = {}) {
        await this._getGenerationPipeline();
        return this.llm._call(prompt, options);
    }

    _createStructuredChain(promptTemplate, outputSchema, generationOptions) {
        const parser = StructuredOutputParser.fromZodSchema(outputSchema);
        const prompt = new PromptTemplate({
            template: `${promptTemplate}\n{format_instructions}\n`,
            inputVariables: ["context"],
            partialVariables: { format_instructions: parser.getFormatInstructions() },
        });
        return new LLMChain({ llm: this.llm, prompt, ...generationOptions });
    }

    _parseStructuredResult(resultText) {
        try {
            const match = resultText.match(/```json\n(.*)\n```/s);
            return match ? JSON.parse(match[1]) : null;
        } catch (e) {
            return null;
        }
    }

    async bootstrapTerm(termKey) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }
        const extractor = await this._getFeaturePipeline();
        const output = await extractor(termKey, { pooling: 'mean', normalize: true });
        const embeddingVector = Array.from(output.data);
        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        return new Term(termKey, embeddingVector, complexity);
    }

    _buildHypothesisContext(tasks, goals, contradictions) {
        let context = "Observations:\n" + tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        if (goals.length > 0) {
            context += "\n\nCurrent Goals:\n" + goals.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        }
        if (contradictions.length > 0) {
            context += "\n\nRecent Contradictions:\n" + contradictions.map(c => `${c.taskA.termKey} vs ${c.taskB.termKey}`).join('\n');
        }
        return context;
    }

    _createHypothesisPrompt(type, promptTemplate) {
        if (promptTemplate) return promptTemplate;
        const prompts = {
            [HYPOTHESIS_TYPES.GENERAL]: "Based on the following context:\n{context}\n\nA general principle that explains these observations is:",
            [HYPOTHESIS_TYPES.CREATIVE]: "Based on the following context:\n{context}\n\nA surprising insight that explains these observations is:",
            [HYPOTHESIS_TYPES.GOAL_ORIENTED]: "Given the following context:\n{context}\n\nA useful hypothesis to explore to achieve the current goals is:",
        };
        return prompts[type] || prompts[HYPOTHESIS_TYPES.GENERAL];
    }

    async generateHypotheses(tasks, config = {}) {
        if (!tasks || tasks.length === 0) return [];
        await this._getGenerationPipeline();

        const { type = HYPOTHESIS_TYPES.GENERAL, num = 3, refinement = null, promptTemplate = null, goals = [], contradictions = [] } = config;

        const context = this._buildHypothesisContext(tasks, goals, contradictions);
        const selectedPrompt = this._createHypothesisPrompt(type, promptTemplate);

        const chain = this._createStructuredChain(selectedPrompt, require('zod').object({ term: require('zod').string().describe("The generated hypothesis in valid Narsese format.") }), {});

        const results = await Promise.all(Array(num).fill().map(() => chain.call({ context })));

        const hypotheses = results.map(result => {
            const parsed = this._parseStructuredResult(result.text);
            if (!parsed || !parsed.term) return null;
            const parsedTerm = parseTerm(parsed.term);
            return parsedTerm ? new Task(parsedTerm, '.', { confidence: 0.5, frequency: 0.5 }) : null;
        }).filter(Boolean);

        return refinement ? Promise.all(hypotheses.map(h => this.refineHypothesis(h, refinement))) : hypotheses;
    }

    async generateHypothesis(task, config = {}) {
        if (!task) return null;
        return (await this.generateHypotheses([task], { ...config, num: 1 }))[0] || null;
    }

    async explain(termKey, config = {}) {
        const { type = 'simple', context = null, promptTemplate = null } = config;
        if (!promptTemplate && (!termKey || typeof termKey !== 'string')) return { error: "Cannot explain an empty term." };

        const finalPrompt = promptTemplate ? promptTemplate : this._getExplanationPrompt(termKey, config);
        const fullPrompt = context ? `Context: ${context}\n${finalPrompt}` : finalPrompt;

        const explanationText = await this._generate(fullPrompt, { max_new_tokens: 300 });
        if (!explanationText) return { error: `Explanation generation failed.` };

        return { term: termKey, explanation: explanationText };
    }

    _getExplanationPrompt(termKey, { type, relatedTerms = [], audience = 'intermediate' }) {
        const prompts = {
            simple: `Explain what "${termKey}" means.`,
            structured: `Provide a structured explanation of "${termKey}" with Definition, Key Components, and Examples.`,
            comparison: `Explain "${termKey}" by comparing it with: ${relatedTerms.join(', ')}.`,
        };
        return prompts[type] || prompts.simple;
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        if (!hypotheses || hypotheses.length === 0) return [];
        const extractor = await this._getFeaturePipeline();

        const taskEmbeddings = await Promise.all(tasks.map(async task => {
            const output = await extractor(task.termKey, {pooling: 'mean', normalize: true});
            return Array.from(output.data);
        }));

        const evaluatedHypotheses = await Promise.all(hypotheses.map(async hypothesis => {
            const output = await extractor(hypothesis.termKey, {pooling: 'mean', normalize: true});
            const hypothesisEmbedding = Array.from(output.data);
            const totalSimilarity = taskEmbeddings.reduce((sum, taskEmbedding) => sum + cosineSimilarity(hypothesisEmbedding, taskEmbedding), 0);
            const averageRelevance = taskEmbeddings.length > 0 ? totalSimilarity / taskEmbeddings.length : 0;
            hypothesis.state.truthValue.confidence = Math.min(0.9, (hypothesis.state.truthValue.confidence || 0.5) * (0.5 + 0.5 * averageRelevance));
            return {hypothesis, relevance: averageRelevance};
        }));

        return evaluatedHypotheses.sort((a, b) => b.relevance - a.relevance).map(item => item.hypothesis);
    }

    async refineHypothesis(hypothesis, refinementType = REFINEMENT_TYPES.FORMALIZE) {
        const prompts = {
            [REFINEMENT_TYPES.FORMALIZE]: `Refine into a more formal statement: ${hypothesis.termKey}`,
            [REFINEMENT_TYPES.SIMPLIFY]: `Simplify into a more concise statement: ${hypothesis.termKey}`,
        };
        const prompt = prompts[refinementType] || prompts[REFINEMENT_TYPES.FORMALIZE];
        const refinedText = await this._generate(prompt, { max_new_tokens: 60 });
        if (!refinedText) return hypothesis;

        const parsedTerm = parseTerm(refinedText);
        if (!parsedTerm) return hypothesis;

        const refinedHypothesis = new Task(parsedTerm, '.', { ...hypothesis.state.truthValue });

        if (this.reasoner && this.memory) {
            const tempMemory = this.memory.clone();
            tempMemory.addTasks([refinedHypothesis]);
            const MetaCognition = require('../system/MetaCognition');
            const metaCognition = new MetaCognition();
            const contradictions = metaCognition.findContradictions(tempMemory.getAllTasks());
            if (contradictions.some(c => c.severity > 0.8)) {
                return hypothesis; // Reject refinement if it causes a high-severity contradiction
            }
        }

        return refinedHypothesis;
    }

    async answerQuestion(question, context = null) {
        if (!question || typeof question !== 'string') return "Cannot answer an empty question.";
        if (context) {
            const qaPipeline = await this._getQAPipeline();
            const result = await qaPipeline(question, context);
            if (result && result.answer) return result.answer;
        }
        const prompt = context ? `Context: ${context}\nQuestion: ${question}\nAnswer:` : `Question: ${question}\nAnswer:`;
        return this._generate(prompt);
    }

    async suggestPlanRepair(goalTask, failedPlan) {
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
            require('zod').object({ plan: require('zod').array(require('zod').string()).describe("A list of Narsese terms for the new plan.") }),
            {}
        );

        const result = await chain.call({ context: "" }); // context is already in the prompt template
        const parsed = this._parseStructuredResult(result.text);

        if (!parsed || !parsed.plan) {
            return null;
        }

        const planTerms = parsed.plan.map(termKey => parseTerm(termKey)).filter(Boolean);
        return planTerms;
    }

    async proactiveEnrichment(tasks) {
        if (!tasks || tasks.length === 0) return [];
        await this._getGenerationPipeline();

        const newBeliefs = tasks.filter(t => t.punctuation === '.' && t.state.truthValue.confidence > 0.8);
        if (newBeliefs.length === 0) return [];

        const context = "Given the following new beliefs:\n" + newBeliefs.map(t => t.termKey).join('\n');
        const prompt = context + "\n\nWhat are some interesting implications or related concepts? Generate new knowledge in Narsese format.";

        const chain = this._createStructuredChain(
            prompt,
            require('zod').object({ new_knowledge: require('zod').array(require('zod').string()).describe("A list of new Narsese statements.") }),
            {}
        );

        const result = await chain.call({ context: "" });
        const parsed = this._parseStructuredResult(result.text);

        if (!parsed || !parsed.new_knowledge) {
            return [];
        }

        const newTasks = parsed.new_knowledge.map(termKey => {
            const parsedTerm = parseTerm(termKey);
            return parsedTerm ? new Task(parsedTerm, '.', { confidence: 0.6, frequency: 0.5 }) : null;
        }).filter(Boolean);

        return newTasks;
    }
}

module.exports = LM;
