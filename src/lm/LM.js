const Term = require("../core/Term");
const Task = require("../core/Task");
const XenovaLLM = require("./XenovaLLM");
const { parseTerm } = require('../parser/narseseParser');
const { cosineSimilarity } = require('../utils/math');
const { LLMChain } = require("langchain/chains");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { LM: LM_CONFIG } = require('../config');

class LM {
    constructor() {
        this._pipelines = new Map();
        this.llm = null;
    }

    async _getPipeline(type, model, options = {}) {
        if (!this._pipelines.has(type)) {
            const { pipeline } = await import('@xenova/transformers');
            this._pipelines.set(type, pipeline(type, model, options));
        }
        return this._pipelines.get(type);
    }

    async _getFeaturePipeline() {
        return this._getPipeline('feature-extraction', LM_CONFIG.FEATURE_EXTRACTION_MODEL);
    }

    async _getGenerationPipeline() {
        const pipeline = await this._getPipeline('text-generation', LM_CONFIG.TEXT_GENERATION_MODEL, { useCache: false });
        if (!this.llm) {
            this.llm = new XenovaLLM(pipeline);
        }
        return pipeline;
    }

    async _getQAPipeline() {
        return this._getPipeline('question-answering', LM_CONFIG.QA_MODEL, { maxLength: 512 });
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

    async generateHypotheses(tasks, config = {}) {
        if (!tasks || tasks.length === 0) return [];
        await this._getGenerationPipeline();

        const { type = 'general', num = 3, refinement = null, promptTemplate = null } = config;
        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');

        const prompts = {
            general: "Based on these observations:\n{context}\n\nA general principle that explains these observations is:",
            creative: "Based on these observations:\n{context}\n\nA surprising insight that explains these observations is:",
        };
        const selectedPrompt = promptTemplate || prompts[type] || prompts.general;

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

    async refineHypothesis(hypothesis, refinementType = 'formalize') {
        const prompts = {
            formalize: `Refine into a more formal statement: ${hypothesis.termKey}`,
            simplify: `Simplify into a more concise statement: ${hypothesis.termKey}`,
        };
        const prompt = prompts[refinementType] || prompts.formalize;
        const refinedText = await this._generate(prompt, { max_new_tokens: 60 });
        if (!refinedText) return hypothesis;

        const parsedTerm = parseTerm(refinedText);
        return parsedTerm ? new Task(parsedTerm, '.', { ...hypothesis.state.truthValue }) : hypothesis;
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
}

module.exports = LM;
