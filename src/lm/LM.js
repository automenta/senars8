const Term = require("../core/Term");
const Task = require("../core/Task");
const {parseTerm} = require('../parser/NewParser');
const {cosineSimilarity} = require('../utils/math');

class LM {
    constructor() {
        this._featurePipelinePromise = null;
        this._generationPipelinePromise = null;
        this._qaPipelinePromise = null;
    }

    async getFeaturePipeline() {
        if (!this._featurePipelinePromise) {
            const {pipeline} = await import('@xenova/transformers');
            this._featurePipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        return this._featurePipelinePromise;
    }

    async getGenerationPipeline() {
        if (!this._generationPipelinePromise) {
            const {pipeline} = await import('@xenova/transformers');
            this._generationPipelinePromise = pipeline('text-generation', 'Xenova/distilgpt2', {
                maxLength: 1024,
                useCache: false
            });
        }
        return this._generationPipelinePromise;
    }

    async getQAPipeline() {
        if (!this._qaPipelinePromise) {
            const {pipeline} = await import('@xenova/transformers');
            this._qaPipelinePromise = pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad', {
                maxLength: 512
            });
        }
        return this._qaPipelinePromise;
    }

    async _generate(prompt, options = {}) {
        const generator = await this.getGenerationPipeline();
        const result = await generator(prompt, {
            max_new_tokens: 100,
            temperature: 0.7,
            do_sample: true,
            ...options,
            max_length: 1024, // Ensure max_length is always set
        });
        return result?.[0]?.generated_text.replace(prompt, '').trim() || '';
    }

    async bootstrapTerm(termKey) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        const extractor = await this.getFeaturePipeline();
        const output = await extractor(termKey, {pooling: 'mean', normalize: true});
        const embeddingVector = Array.from(output.data);
        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        return new Term(termKey, embeddingVector, complexity);
    }

    async generateHypotheses(tasks, config = {type: 'general', num: 3}) {
        if (!tasks || tasks.length === 0) return [];

        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        const hypotheses = [];

        const prompts = {
            general: [
                `Based on these observations:\n${context}\n\nA general principle that explains these observations is:`,
                `Based on these observations:\n${context}\n\nA causal relationship that might explain these observations is:`,
                `Based on these observations:\n${context}\n\nA pattern that emerges from these observations is:`,
            ],
            creative: [
                `Based on these observations:\n${context}\n\nA surprising insight that explains these observations is:`,
                `Based on these observations:\n${context}\n\nAn unconventional explanation for these observations is:`,
                `Based on these observations:\n${context}\n\nA radical new perspective on these observations is:`,
            ],
            sophisticated: [
                `Based on these observations:\n${context}\n\nIdentify complex relationships between these concepts and propose a unifying theory:`,
                `Based on these observations:\n${context}\n\nWhat would happen if the opposite were true? Propose a counterfactual hypothesis:`,
                `Based on these observations:\n${context}\n\nWhat underlying mechanisms might explain these phenomena? Propose a mechanistic hypothesis:`,
            ],
            comprehensive: [
                `Based on these observations:\n${context}\n\nPropose a testable prediction based on these patterns:`,
                `Based on these observations:\n${context}\n\nWhat insights from an analogous domain might apply here? Propose an analogical hypothesis:`,
                `Based on these observations:\n${context}\n\nWhat meta-level reasoning strategy would be most effective here?`,
            ]
        };

        const selectedPrompts = prompts[config.type] || prompts.general;
        const generationOptions = {
            creative: {temperature: 0.8, max_new_tokens: 60},
            sophisticated: {temperature: 0.75, max_new_tokens: 75},
            comprehensive: {temperature: 0.7, max_new_tokens: 150},
        }[config.type] || {temperature: 0.7, max_new_tokens: 50};

        for (let i = 0; i < Math.min(config.num, selectedPrompts.length); i++) {
            const hypothesisText = await this._generate(selectedPrompts[i], generationOptions);
            if (hypothesisText) {
                const parsedTerm = parseTerm(hypothesisText);
                if (parsedTerm) {
                    hypotheses.push(new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.3 + Math.random() * 0.3,
                            confidence: 0.2 + Math.random() * 0.2
                        }
                    ));
                }
            }
        }
        return hypotheses;
    }

    async explain(termKey, config = {}) {
        const {type = 'simple', context = null, relatedTerms = [], audience = 'intermediate'} = config;
        if (typeof termKey !== 'string' || termKey.length === 0) return {error: "Cannot explain an empty term."};

        const prompts = {
            simple: `Explain what "${termKey}" means:`,
            structured: `Provide a structured explanation of "${termKey}" with the following format:\nDefinition: [definition]\nKey Components: [list key components]\nRelationships: [describe relationships]\nExamples: [provide examples]`,
            visual: `Explain "${termKey}" using visual analogies and concrete imagery. Provide a clear explanation followed by 2-3 visual analogies:`,
            comparison: `Explain "${termKey}" by comparing and contrasting it with related concepts: ${relatedTerms.join(', ')}. Highlight key similarities and differences:`,
            comprehensive: `Provide a comprehensive, multi-perspective explanation of "${termKey}" covering technical, practical, and historical viewpoints.`,
            interactive: `Provide a clear explanation of "${termKey}" and anticipate 3-5 follow-up questions a curious learner might ask, along with brief answers:`,
            counterfactual: `Explain "${termKey}" by exploring counterfactual scenarios. For each scenario, describe what would be different if a key assumption were changed:`,
            audience: {
                beginner: `Explain "${termKey}" in simple terms for a beginner. Avoid technical jargon.`,
                intermediate: `Explain "${termKey}" for someone with some familiarity with the topic.`,
                expert: `Explain "${termKey}" in technical detail for an expert.`
            }
        };

        let prompt;
        if (type === 'audience') {
            prompt = prompts.audience[audience] || prompts.audience.intermediate;
        } else {
            prompt = prompts[type] || prompts.simple;
        }

        if (context) {
            prompt = `Context: ${context}\n${prompt}`;
        }

        const explanationText = await this._generate(prompt, {max_new_tokens: 300});
        if (!explanationText) return {error: `I can't provide a detailed explanation for "${termKey}" at the moment.`};

        // Basic parsing for structured formats for demonstration
        const sections = {};
        if (['structured', 'interactive', 'counterfactual'].includes(type)) {
            explanationText.split('\n').forEach(line => {
                const parts = line.split(':');
                if (parts.length > 1) {
                    sections[parts[0].trim()] = parts.slice(1).join(':').trim();
                }
            });
        }

        return {
            term: termKey,
            explanation: explanationText,
            ...(Object.keys(sections).length > 0 && {sections})
        };
    }

    async evaluateAndRankHypotheses(tasks, hypotheses) {
        if (!hypotheses || hypotheses.length === 0) return [];
        const extractor = await this.getFeaturePipeline();

        const taskEmbeddings = await Promise.all(tasks.map(async task => {
            const output = await extractor(task.termKey, {pooling: 'mean', normalize: true});
            return Array.from(output.data);
        }));

        const evaluatedHypotheses = await Promise.all(hypotheses.map(async hypothesis => {
            const output = await extractor(hypothesis.termKey, {pooling: 'mean', normalize: true});
            const hypothesisEmbedding = Array.from(output.data);

            const totalSimilarity = taskEmbeddings.reduce((sum, taskEmbedding) => sum + cosineSimilarity(hypothesisEmbedding, taskEmbedding), 0);
            const averageRelevance = taskEmbeddings.length > 0 ? totalSimilarity / taskEmbeddings.length : 0;

            hypothesis.state.truthValue.confidence = Math.min(0.9, hypothesis.state.truthValue.confidence * (0.5 + 0.5 * averageRelevance));
            return {hypothesis, relevance: averageRelevance};
        }));

        evaluatedHypotheses.sort((a, b) => b.relevance - a.relevance);
        return evaluatedHypotheses.map(item => item.hypothesis);
    }

    async answerQuestion(question, context = null) {
        if (typeof question !== 'string' || question.length === 0) {
            return "Cannot answer an empty question.";
        }
        if (context) {
            const qaPipeline = await this.getQAPipeline();
            const result = await qaPipeline(question, context);
            if (result && result.answer) return result.answer;
        }
        const prompt = context ? `Context: ${context}\nQuestion: ${question}\nAnswer:` : `Question: ${question}\nAnswer:`;
        return this._generate(prompt);
    }
}

module.exports = LM;
