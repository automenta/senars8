const Term = require("../core/Term");
const Task = require("../core/Task");
const {parseTerm} = require('../parser/NewParser');

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
            this._generationPipelinePromise = pipeline('text-generation', 'Xenova/distilgpt2');
        }
        return this._generationPipelinePromise;
    }

    async getQAPipeline() {
        if (!this._qaPipelinePromise) {
            const {pipeline} = await import('@xenova/transformers');
            this._qaPipelinePromise = pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad');
        }
        return this._qaPipelinePromise;
    }

    async bootstrapTerm(termKey) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        const extractor = await this.getFeaturePipeline();

        const output = await extractor(termKey, {
            pooling: 'mean',
            normalize: true,
        });

        const embeddingVector = Array.from(output.data);
        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        return new Term(termKey, embeddingVector, complexity);
    }

    async generateHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();

        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');

        const hypotheses = [];

        for (let i = 0; i < 3; i++) {
            const generalizationPrompt = `Based on these observations:\n${context}\n\nA general principle that explains these observations is:`;
            const generalizationResult = await generator(generalizationPrompt, {
                max_new_tokens: 50,
                temperature: 0.7,
                do_sample: true
            });

            if (generalizationResult && generalizationResult[0] && generalizationResult[0].generated_text) {
                const hypothesisText = generalizationResult[0].generated_text.replace(generalizationPrompt, '').trim();
                if (hypothesisText.length > 0) {
                    const hypothesisTask = new Task(
                        parseTerm(hypothesisText),
                        '.',
                        {
                            frequency: 0.5,
                            confidence: 0.3
                        }
                    );
                    hypotheses.push(hypothesisTask);
                }
            }
        }

        return hypotheses;
    }

    async explain(termKey, question = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return "Cannot explain an empty term.";
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            if (question) {
                prompt = `Question: ${question}\nTerm: ${termKey}\nExplanation:`;
            } else {
                prompt = `Explain what "${termKey}" means:`;
            }

            const result = await generator(prompt, {
                max_new_tokens: 100,
                temperature: 0.5,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                return result[0].generated_text.replace(prompt, '').trim();
            }

            return `I can't provide a detailed explanation for "${termKey}" at the moment.`;
        } catch (error) {
            console.error('Error generating explanation:', error);
            return `Error generating explanation for "${termKey}": ${error.message}`;
        }
    }

    async summarize(tasks) {
        if (!tasks || tasks.length === 0) {
            return "No tasks to summarize.";
        }

        try {
            const generator = await this.getGenerationPipeline();

            const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');

            const prompt = `Summarize the following knowledge:\n${context}\n\nSummary:`;

            const result = await generator(prompt, {
                max_new_tokens: 150,
                temperature: 0.5,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                return result[0].generated_text.replace(prompt, '').trim();
            }

            return "Unable to generate a summary at this time.";
        } catch (error) {
            console.error('Error generating summary:', error);
            return `Error generating summary: ${error.message}`;
        }
    }

    async evaluateCoherence(tasks) {
        if (!tasks || tasks.length === 0) {
            return {coherence: 0, explanation: "No tasks to evaluate."};
        }

        try {
            const extractor = await this.getFeaturePipeline();

            const embeddings = [];
            for (const task of tasks) {
                const output = await extractor(task.termKey, {
                    pooling: 'mean',
                    normalize: true,
                });
                embeddings.push({
                    task: task,
                    embedding: Array.from(output.data)
                });
            }

            let totalSimilarity = 0;
            let pairCount = 0;

            for (let i = 0; i < embeddings.length; i++) {
                for (let j = i + 1; j < embeddings.length; j++) {
                    const sim = this.cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
                    totalSimilarity += sim;
                    pairCount++;
                }
            }

            const averageSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;

            const coherence = Math.min(1.0, averageSimilarity * 2);

            return {
                coherence: coherence,
                explanation: `Coherence score based on semantic similarity of ${pairCount} term pairs.`
            };
        } catch (error) {
            console.error('Error evaluating coherence:', error);
            return {
                coherence: 0,
                explanation: `Error evaluating coherence: ${error.message}`
            };
        }
    }

    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const divisor = Math.sqrt(normA) * Math.sqrt(normB);
        if (divisor === 0) {
            return 0;
        }

        return dotProduct / divisor;
    }
}

module.exports = LM;
