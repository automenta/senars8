const {pipeline} = require('@xenova/transformers');
const Term = require("../core/Term");
const Task = require("../core/Task");

class LM {
    constructor() {
        this._featurePipelinePromise = null;
        this._generationPipelinePromise = null;
        this._qaPipelinePromise = null;
    }

    getFeaturePipeline() {
        if (!this._featurePipelinePromise) {
            this._featurePipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        return this._featurePipelinePromise;
    }

    getGenerationPipeline() {
        if (!this._generationPipelinePromise) {
            // Using a lightweight generation model for hypothesis generation
            this._generationPipelinePromise = pipeline('text-generation', 'Xenova/distilgpt2');
        }
        return this._generationPipelinePromise;
    }

    getQAPipeline() {
        if (!this._qaPipelinePromise) {
            // Using a QA model for explanations
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

    /**
     * Generates hypotheses based on a set of tasks.
     * @param {Task[]} tasks - Array of tasks to generate hypotheses from.
     * @returns {Promise<Task[]>} Array of generated hypothesis tasks.
     */
    async generateHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        // Get the generation pipeline
        const generator = await this.getGenerationPipeline();

        // Create a context from the tasks
        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');

        // Generate hypotheses
        const hypotheses = [];
        
        // Generate 3 different types of hypotheses
        for (let i = 0; i < 3; i++) {
            // 1. Generalization hypothesis
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
                        hypothesisText,
                        '.',
                        {
                            frequency: 0.5, // Uncertain hypothesis
                            confidence: 0.3
                        }
                    );
                    hypotheses.push(hypothesisTask);
                }
            }
        }

        return hypotheses;
    }

    /**
     * Explains a task or concept using natural language.
     * @param {string} termKey - The term to explain.
     * @param {string} question - Optional question to guide the explanation.
     * @returns {Promise<string>} Natural language explanation.
     */
    async explain(termKey, question = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return "Cannot explain an empty term.";
        }

        try {
            // For now, we'll generate a simple explanation
            // In a more advanced implementation, we would use the QA pipeline
            // with a knowledge base or context
            
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

    /**
     * Generates a natural language summary of a set of tasks.
     * @param {Task[]} tasks - Array of tasks to summarize.
     * @returns {Promise<string>} Natural language summary.
     */
    async summarize(tasks) {
        if (!tasks || tasks.length === 0) {
            return "No tasks to summarize.";
        }

        try {
            const generator = await this.getGenerationPipeline();
            
            // Create a context from the tasks
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

    /**
     * Evaluates the coherence of a set of tasks.
     * @param {Task[]} tasks - Array of tasks to evaluate.
     * @returns {Promise<object>} Coherence evaluation results.
     */
    async evaluateCoherence(tasks) {
        if (!tasks || tasks.length === 0) {
            return { coherence: 0, explanation: "No tasks to evaluate." };
        }

        try {
            // For now, we'll use a simple heuristic based on term similarity
            // In a more advanced implementation, we would use more sophisticated methods
            
            const extractor = await this.getFeaturePipeline();
            
            // Extract embeddings for all terms
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
            
            // Calculate average similarity between all pairs
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
            
            // Coherence is based on average similarity
            const coherence = Math.min(1.0, averageSimilarity * 2); // Scale to 0-1 range
            
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

    /**
     * Calculates cosine similarity between two vectors.
     * @param {number[]} vecA - First vector.
     * @param {number[]} vecB - Second vector.
     * @returns {number} Cosine similarity.
     */
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
