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
            this._generationPipelinePromise = pipeline('text-generation', 'Xenova/distilgpt2', {
                // Limit the model's maximum length to prevent overflow errors
                maxLength: 1024,
                // Disable past_key_values caching to prevent sequence length issues
                useCache: false
            });
        }
        return this._generationPipelinePromise;
    }

    async getQAPipeline() {
        if (!this._qaPipelinePromise) {
            const {pipeline} = await import('@xenova/transformers');
            this._qaPipelinePromise = pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad', {
                // Limit the model's maximum length to prevent overflow errors
                maxLength: 512
            });
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

        // Generate different types of hypotheses
        // 1. General principle
        const generalizationPrompt = `Based on these observations:\n${context}\n\nA general principle that explains these observations is:`;
        const generalizationResult = await generator(generalizationPrompt, {
            max_new_tokens: 50,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true,
            // Limit total sequence length to prevent overflow
            max_length: 1024
        });

        if (generalizationResult && generalizationResult[0] && generalizationResult[0].generated_text) {
            const hypothesisText = generalizationResult[0].generated_text.replace(generalizationPrompt, '').trim();
            if (hypothesisText.length > 0) {
                // Try to parse the generated text as a term
                const parsedTerm = parseTerm(hypothesisText);
                // Only create a task if parsing was successful
                if (parsedTerm) {
                    const hypothesisTask = new Task(
                        parsedTerm,
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

        // 2. Causal relationship
        const causalPrompt = `Based on these observations:\n${context}\n\nA causal relationship that might explain these observations is:`;
        const causalResult = await generator(causalPrompt, {
            max_new_tokens: 50,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (causalResult && causalResult[0] && causalResult[0].generated_text) {
            const causalText = causalResult[0].generated_text.replace(causalPrompt, '').trim();
            if (causalText.length > 0) {
                const parsedTerm = parseTerm(causalText);
                if (parsedTerm) {
                    const causalTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.4,
                            confidence: 0.25
                        }
                    );
                    hypotheses.push(causalTask);
                }
            }
        }

        // 3. Pattern recognition
        const patternPrompt = `Based on these observations:\n${context}\n\nA pattern that emerges from these observations is:`;
        const patternResult = await generator(patternPrompt, {
            max_new_tokens: 50,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (patternResult && patternResult[0] && patternResult[0].generated_text) {
            const patternText = patternResult[0].generated_text.replace(patternPrompt, '').trim();
            if (patternText.length > 0) {
                const parsedTerm = parseTerm(patternText);
                if (parsedTerm) {
                    const patternTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.45,
                            confidence: 0.28
                        }
                    );
                    hypotheses.push(patternTask);
                }
            }
        }

        return hypotheses;
    }

    /**
     * Generate more sophisticated hypotheses based on complex reasoning
     * @param {Task[]} tasks - Array of tasks to generate hypotheses from
     * @returns {Task[]} Array of generated hypothesis tasks
     */
    async generateSophisticatedHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();
        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        const hypotheses = [];

        // 1. Generate hypotheses about relationships between multiple concepts
        const relationshipPrompt = `Based on these observations:\n${context}\n\nIdentify complex relationships between these concepts and propose a unifying theory:`;
        const relationshipResult = await generator(relationshipPrompt, {
            max_new_tokens: 75,
            temperature: 0.8,
            max_length: 1024,
            do_sample: true
        });

        if (relationshipResult && relationshipResult[0] && relationshipResult[0].generated_text) {
            const hypothesisText = relationshipResult[0].generated_text.replace(relationshipPrompt, '').trim();
            if (hypothesisText.length > 0) {
                const parsedTerm = parseTerm(hypothesisText);
                if (parsedTerm) {
                    const hypothesisTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.4,
                            confidence: 0.3
                        }
                    );
                    hypotheses.push(hypothesisTask);
                }
            }
        }

        // 2. Generate counterfactual hypotheses
        const counterfactualPrompt = `Based on these observations:\n${context}\n\nWhat would happen if the opposite were true? Propose a counterfactual hypothesis:`;
        const counterfactualResult = await generator(counterfactualPrompt, {
            max_new_tokens: 75,
            temperature: 0.9,
            max_length: 1024,
            do_sample: true
        });

        if (counterfactualResult && counterfactualResult[0] && counterfactualResult[0].generated_text) {
            const hypothesisText = counterfactualResult[0].generated_text.replace(counterfactualPrompt, '').trim();
            if (hypothesisText.length > 0) {
                const parsedTerm = parseTerm(hypothesisText);
                if (parsedTerm) {
                    const hypothesisTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.35,
                            confidence: 0.25
                        }
                    );
                    hypotheses.push(hypothesisTask);
                }
            }
        }

        // 3. Generate hypotheses about underlying mechanisms
        const mechanismPrompt = `Based on these observations:\n${context}\n\nWhat underlying mechanisms might explain these phenomena? Propose a mechanistic hypothesis:`;
        const mechanismResult = await generator(mechanismPrompt, {
            max_new_tokens: 75,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (mechanismResult && mechanismResult[0] && mechanismResult[0].generated_text) {
            const hypothesisText = mechanismResult[0].generated_text.replace(mechanismPrompt, '').trim();
            if (hypothesisText.length > 0) {
                const parsedTerm = parseTerm(hypothesisText);
                if (parsedTerm) {
                    const hypothesisTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.45,
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
     * Generate a comprehensive set of hypotheses using multiple approaches
     * @param {Task[]} tasks - Array of tasks to generate hypotheses from
     * @returns {Task[]} Array of generated hypothesis tasks
     */
    async generateComprehensiveHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        // Generate hypotheses using different methods
        const creativeHypotheses = await this.generateCreativeHypotheses(tasks, 3);
        const sophisticatedHypotheses = await this.generateSophisticatedHypotheses(tasks);
        const gapFillingHypotheses = await this.generateGapFillingHypotheses(tasks);
        const metaHypotheses = await this.generateMetaHypotheses(tasks);
        const causalHypotheses = await this.generateCausalHypotheses(tasks);
        const predictiveHypotheses = await this.generatePredictiveHypotheses(tasks);

        // Combine all hypotheses
        const allHypotheses = [
            ...creativeHypotheses,
            ...sophisticatedHypotheses,
            ...gapFillingHypotheses,
            ...metaHypotheses,
            ...causalHypotheses,
            ...predictiveHypotheses
        ];

        // Remove duplicates based on termKey
        const uniqueHypotheses = [];
        const seenTermKeys = new Set();

        for (const hypothesis of allHypotheses) {
            if (!seenTermKeys.has(hypothesis.termKey)) {
                seenTermKeys.add(hypothesis.termKey);
                uniqueHypotheses.push(hypothesis);
            }
        }

        return uniqueHypotheses;
    }

    /**
     * Evaluate and rank hypotheses based on coherence and relevance
     * @param {Task[]} tasks - Array of existing tasks
     * @param {Task[]} hypotheses - Array of hypothesis tasks to evaluate
     * @returns {Task[]} Array of ranked hypothesis tasks
     */
    async evaluateAndRankHypotheses(tasks, hypotheses) {
        if (!hypotheses || hypotheses.length === 0) {
            return [];
        }

        // Get embeddings for all tasks and hypotheses
        const extractor = await this.getFeaturePipeline();
        
        // Get embeddings for existing tasks
        const taskEmbeddings = [];
        for (const task of tasks) {
            const output = await extractor(task.termKey, {
                pooling: 'mean',
                normalize: true,
            });
            taskEmbeddings.push(Array.from(output.data));
        }

        // Evaluate each hypothesis
        const evaluatedHypotheses = [];
        for (const hypothesis of hypotheses) {
            const output = await extractor(hypothesis.termKey, {
                pooling: 'mean',
                normalize: true,
            });
            const hypothesisEmbedding = Array.from(output.data);

            // Calculate relevance to existing tasks
            let totalSimilarity = 0;
            for (const taskEmbedding of taskEmbeddings) {
                const similarity = this.cosineSimilarity(hypothesisEmbedding, taskEmbedding);
                totalSimilarity += similarity;
            }
            const averageRelevance = taskEmbeddings.length > 0 ? totalSimilarity / taskEmbeddings.length : 0;

            // Update hypothesis confidence based on relevance
            hypothesis.state.truthValue.confidence = Math.min(0.9, hypothesis.state.truthValue.confidence * (0.5 + 0.5 * averageRelevance));

            evaluatedHypotheses.push({
                hypothesis: hypothesis,
                relevance: averageRelevance
            });
        }

        // Sort by relevance
        evaluatedHypotheses.sort((a, b) => b.relevance - a.relevance);

        // Return ranked hypotheses
        return evaluatedHypotheses.map(item => item.hypothesis);
    }

    async generateCreativeHypotheses(tasks, numHypotheses = 5) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();

        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');

        const hypotheses = [];

        // Generate more creative and diverse hypotheses
        const creativePrompts = [
            `Based on these observations:\n${context}\n\nA surprising insight that explains these observations is:`,
            `Based on these observations:\n${context}\n\nAn unconventional explanation for these observations is:`,
            `Based on these observations:\n${context}\n\nA counterintuitive principle that might explain these observations is:`,
            `Based on these observations:\n${context}\n\nA radical new perspective on these observations is:`,
            `Based on these observations:\n${context}\n\nAn innovative theory that explains these observations is:`
        ];

        for (let i = 0; i < Math.min(numHypotheses, creativePrompts.length); i++) {
            const prompt = creativePrompts[i];
            const result = await generator(prompt, {
                max_new_tokens: 60,
                temperature: 0.8,
            max_length: 1024, // Higher temperature for more creativity
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const hypothesisText = result[0].generated_text.replace(prompt, '').trim();
                if (hypothesisText.length > 0) {
                    const parsedTerm = parseTerm(hypothesisText);
                    if (parsedTerm) {
                        const hypothesisTask = new Task(
                            parsedTerm,
                            '.',
                            {
                                frequency: 0.3 + Math.random() * 0.3, // Random frequency between 0.3 and 0.6
                                confidence: 0.2 + Math.random() * 0.2 // Random confidence between 0.2 and 0.4
                            }
                        );
                        hypotheses.push(hypothesisTask);
                    }
                }
            }
        }

        return hypotheses;
    }

    /**
     * Generate causal hypotheses based on observed correlations
     * @param {Task[]} tasks - Array of tasks to generate hypotheses from
     * @returns {Task[]} Array of generated causal hypothesis tasks
     */
    async generateCausalHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();
        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        const hypotheses = [];

        // Generate causal hypotheses
        const causalPrompt = `Based on these observations:\n${context}\n\nIdentify potential causal relationships between these phenomena. For each causal relationship, propose both a mechanism and testable predictions:\n\nCausal Hypotheses:`;
        
        const result = await generator(causalPrompt, {
            max_new_tokens: 150,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (result && result[0] && result[0].generated_text) {
            const hypothesisText = result[0].generated_text.replace(causalPrompt, '').trim();
            
            // Try to extract multiple hypotheses from the response
            const lines = hypothesisText.split('\n');
            for (const line of lines) {
                // Look for hypotheses formatted as statements
                const hypothesisMatch = line.match(/.*[.!?]$/);
                if (hypothesisMatch) {
                    const parsedTerm = parseTerm(hypothesisMatch[0]);
                    if (parsedTerm) {
                        const hypothesisTask = new Task(
                            parsedTerm,
                            '.',
                            {
                                frequency: 0.4,
                                confidence: 0.3
                            }
                        );
                        hypotheses.push(hypothesisTask);
                    }
                }
            }
        }

        return hypotheses;
    }

    /**
     * Generate hypotheses based on analogical reasoning
     * @param {Task[]} tasks - Array of tasks to generate hypotheses from
     * @param {Task[]} analogySourceTasks - Array of tasks from an analogy source domain
     * @returns {Task[]} Array of generated hypothesis tasks
     */
    async generateAnalogicalHypotheses(tasks, analogySourceTasks) {
        if (!tasks || tasks.length === 0 || !analogySourceTasks || analogySourceTasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();
        
        const targetContext = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        const sourceContext = analogySourceTasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');

        const hypotheses = [];

        // Generate analogical hypotheses
        const analogyPrompt = `Consider these observations in domain A:
${sourceContext}

And these observations in domain B:
${targetContext}

What insights from domain A might explain phenomena in domain B? Propose an analogical hypothesis:`;
        
        const result = await generator(analogyPrompt, {
            max_new_tokens: 100,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (result && result[0] && result[0].generated_text) {
            const hypothesisText = result[0].generated_text.replace(analogyPrompt, '').trim();
            if (hypothesisText.length > 0) {
                const parsedTerm = parseTerm(hypothesisText);
                if (parsedTerm) {
                    const hypothesisTask = new Task(
                        parsedTerm,
                        '.',
                        {
                            frequency: 0.4,
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
     * Generate predictive hypotheses based on existing patterns
     * @param {Task[]} tasks - Array of tasks to generate hypotheses from
     * @returns {Task[]} Array of generated predictive hypothesis tasks
     */
    async generatePredictiveHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();
        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        const hypotheses = [];

        // Generate predictive hypotheses
        const predictivePrompt = `Based on these observations:
${context}

What future events or states might logically follow from these patterns? Propose testable predictions:

Predictions:`;
        
        const result = await generator(predictivePrompt, {
            max_new_tokens: 150,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (result && result[0] && result[0].generated_text) {
            const hypothesisText = result[0].generated_text.replace(predictivePrompt, '').trim();
            
            // Try to extract multiple hypotheses from the response
            const lines = hypothesisText.split('\n');
            for (const line of lines) {
                // Look for hypotheses formatted as statements
                const hypothesisMatch = line.match(/.*[.!?]$/);
                if (hypothesisMatch) {
                    const parsedTerm = parseTerm(hypothesisMatch[0]);
                    if (parsedTerm) {
                        const hypothesisTask = new Task(
                            parsedTerm,
                            '.',
                            {
                                frequency: 0.5,
                                confidence: 0.35
                            }
                        );
                        hypotheses.push(hypothesisTask);
                    }
                }
            }
        }

        return hypotheses;
    }

    /**
     * Generate meta-hypotheses about the reasoning process itself
     * @param {Task[]} tasks - Array of tasks to generate meta-hypotheses from
     * @returns {Task[]} Array of generated meta-hypothesis tasks
     */
    async generateMetaHypotheses(tasks) {
        if (!tasks || tasks.length === 0) {
            return [];
        }

        const generator = await this.getGenerationPipeline();
        const context = tasks.map(task => `${task.termKey}${task.punctuation}`).join('\n');
        const hypotheses = [];

        // Generate meta-hypotheses about reasoning strategies
        const metaPrompt = `Based on these observations:\n${context}\n\nWhat general principles might guide effective reasoning about these phenomena? Propose meta-level hypotheses about reasoning strategies:`;
        
        const result = await generator(metaPrompt, {
            max_new_tokens: 100,
            temperature: 0.7,
            max_length: 1024,
            do_sample: true
        });

        if (result && result[0] && result[0].generated_text) {
            const hypothesisText = result[0].generated_text.replace(metaPrompt, '').trim();
            if (hypothesisText.length > 0) {
                const parsedTerm = parseTerm(hypothesisText);
                if (parsedTerm) {
                    const hypothesisTask = new Task(
                        parsedTerm,
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
            max_length: 1024,
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

    async explainStructured(termKey, context = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return {error: "Cannot explain an empty term."};
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            if (context) {
                prompt = `Context: ${context}\nTerm: ${termKey}\n\nProvide a structured explanation of "${termKey}" with the following format:\nDefinition: [definition]\nKey Components: [list key components]\nRelationships: [describe relationships to other concepts]\nExamples: [provide examples]\nSignificance: [explain importance]\n\nExplanation:`;
            } else {
                prompt = `Provide a structured explanation of "${termKey}" with the following format:\nDefinition: [definition]\nKey Components: [list key components]\nRelationships: [describe relationships to other concepts]\nExamples: [provide examples]\nSignificance: [explain importance]\n\nExplanation:`;
            }

            const result = await generator(prompt, {
                max_new_tokens: 200,
                temperature: 0.5,
            max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const explanationText = result[0].generated_text.replace(prompt, '').trim();
                
                // Parse the structured explanation
                const sections = {};
                const lines = explanationText.split('\n');
                let currentSection = '';
                
                for (const line of lines) {
                    if (line.startsWith('Definition:')) {
                        currentSection = 'definition';
                        sections[currentSection] = line.substring(11).trim();
                    } else if (line.startsWith('Key Components:')) {
                        currentSection = 'components';
                        sections[currentSection] = line.substring(15).trim();
                    } else if (line.startsWith('Relationships:')) {
                        currentSection = 'relationships';
                        sections[currentSection] = line.substring(14).trim();
                    } else if (line.startsWith('Examples:')) {
                        currentSection = 'examples';
                        sections[currentSection] = line.substring(9).trim();
                    } else if (line.startsWith('Significance:')) {
                        currentSection = 'significance';
                        sections[currentSection] = line.substring(13).trim();
                    } else if (currentSection) {
                        sections[currentSection] += ' ' + line.trim();
                    }
                }
                
                return {
                    term: termKey,
                    explanation: explanationText,
                    sections: sections
                };
            }

            return {error: `I can't provide a detailed explanation for "${termKey}" at the moment.`};
        } catch (error) {
            console.error('Error generating structured explanation:', error);
            return {error: `Error generating explanation for "${termKey}": ${error.message}`};
        }
    }

    /**
     * Generate an explanation with visual analogies
     * @param {string} termKey - The term to explain
     * @param {string} context - Optional context for the explanation
     * @returns {Object} Detailed explanation with visual analogies
     */
    async explainWithVisualAnalogies(termKey, context = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return {error: "Cannot explain an empty term."};
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            if (context) {
                prompt = `Context: ${context}\nTerm: ${termKey}\n\nExplain "${termKey}" using visual analogies and concrete imagery. Provide a clear explanation followed by 2-3 analogies that help visualize the concept:\n\nExplanation:\n[clear explanation]\n\nVisual Analogies:\n1. [visual analogy 1]\n2. [visual analogy 2]\n3. [visual analogy 3]`;
            } else {
                prompt = `Explain "${termKey}" using visual analogies and concrete imagery. Provide a clear explanation followed by 2-3 analogies that help visualize the concept:\n\nExplanation:\n[clear explanation]\n\nVisual Analogies:\n1. [visual analogy 1]\n2. [visual analogy 2]\n3. [visual analogy 3]`;
            }

            const result = await generator(prompt, {
                max_new_tokens: 250,
                temperature: 0.6,
            max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const explanationText = result[0].generated_text.replace(prompt, '').trim();
                
                // Parse the explanation and analogies
                const lines = explanationText.split('\n');
                let inExplanation = false;
                let inAnalogies = false;
                let explanation = '';
                const analogies = [];
                
                for (const line of lines) {
                    if (line.startsWith('Explanation:')) {
                        inExplanation = true;
                        inAnalogies = false;
                    } else if (line.startsWith('Visual Analogies:')) {
                        inExplanation = false;
                        inAnalogies = true;
                    } else if (inExplanation && line.trim() !== '') {
                        explanation += line.trim() + ' ';
                    } else if (inAnalogies) {
                        const match = line.match(/^\d+\.\s*(.+)$/);
                        if (match) {
                            analogies.push(match[1].trim());
                        }
                    }
                }
                
                return {
                    term: termKey,
                    explanation: explanation.trim(),
                    visualAnalogies: analogies
                };
            }

            return {error: `I can't provide a visual explanation for "${termKey}" at the moment.`};
        } catch (error) {
            console.error('Error generating visual explanation:', error);
            return {error: `Error generating visual explanation for "${termKey}": ${error.message}`};
        }
    }

    /**
     * Generate an explanation comparing and contrasting related concepts
     * @param {string} termKey - The term to explain
     * @param {string[]} relatedTerms - Related terms to compare with
     * @returns {Object} Detailed comparison explanation
     */
    async explainWithComparison(termKey, relatedTerms = []) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return {error: "Cannot explain an empty term."};
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            if (relatedTerms.length > 0) {
                const relatedList = relatedTerms.join(', ');
                prompt = `Explain "${termKey}" by comparing and contrasting it with related concepts: ${relatedList}. Highlight key similarities and differences:\n\nExplanation:`;
            } else {
                prompt = `Explain "${termKey}" by comparing and contrasting it with related concepts. Highlight key similarities and differences:\n\nExplanation:`;
            }

            const result = await generator(prompt, {
                max_new_tokens: 200,
                temperature: 0.6,
            max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const explanationText = result[0].generated_text.replace(prompt, '').trim();
                
                return {
                    term: termKey,
                    relatedTerms: relatedTerms,
                    explanation: explanationText
                };
            }

            return {error: `I can't provide a comparative explanation for "${termKey}" at the moment.`};
        } catch (error) {
            console.error('Error generating comparative explanation:', error);
            return {error: `Error generating comparative explanation for "${termKey}": ${error.message}`};
        }
    }

    /**
     * Generate a comprehensive, multi-perspective explanation of a term
     * @param {string} termKey - The term to explain
     * @param {string} context - Optional context for the explanation
     * @returns {Object} Detailed explanation with multiple perspectives
     */
    async explainComprehensive(termKey, context = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return {error: "Cannot explain an empty term."};
        }

        try {
            const generator = await this.getGenerationPipeline();

            // Generate multiple perspectives on the term
            const perspectives = [
                {
                    name: "technical",
                    prompt: `Explain "${termKey}" from a technical/academic perspective${context ? ` in the context of ${context}` : ''}. Focus on precise definitions and formal descriptions:`
                },
                {
                    name: "practical",
                    prompt: `Explain "${termKey}" from a practical/application perspective${context ? ` in the context of ${context}` : ''}. Focus on real-world usage and examples:`
                },
                {
                    name: "historical",
                    prompt: `Explain the historical development of "${termKey}"${context ? ` in the context of ${context}` : ''}. Discuss its origins and evolution:`
                },
                {
                    name: "philosophical",
                    prompt: `Explain "${termKey}" from a philosophical perspective${context ? ` in the context of ${context}` : ''}. Discuss deeper meanings and implications:`
                }
            ];

            const explanation = {
                term: termKey,
                context: context,
                perspectives: {}
            };

            // Generate each perspective
            for (const perspective of perspectives) {
                const result = await generator(perspective.prompt, {
                    max_new_tokens: 100,
                    temperature: 0.7,
            max_length: 1024,
                    do_sample: true
                });

                if (result && result[0] && result[0].generated_text) {
                    explanation.perspectives[perspective.name] = result[0].generated_text.replace(perspective.prompt, '').trim();
                }
            }

            // Generate a synthesis that combines all perspectives
            const synthesisPrompt = `Based on these different perspectives on "${termKey}":
Technical: ${explanation.perspectives.technical || 'N/A'}
Practical: ${explanation.perspectives.practical || 'N/A'}
Historical: ${explanation.perspectives.historical || 'N/A'}
Philosophical: ${explanation.perspectives.philosophical || 'N/A'}

Provide a synthesis that integrates all these viewpoints into a cohesive understanding:`;

            const synthesisResult = await generator(synthesisPrompt, {
                max_new_tokens: 150,
                temperature: 0.6,
            max_length: 1024,
                do_sample: true
            });

            if (synthesisResult && synthesisResult[0] && synthesisResult[0].generated_text) {
                explanation.synthesis = synthesisResult[0].generated_text.replace(synthesisPrompt, '').trim();
            }

            return explanation;
        } catch (error) {
            console.error('Error generating comprehensive explanation:', error);
            return {error: `Error generating comprehensive explanation for "${termKey}": ${error.message}`};
        }
    }

    /**
     * Generate an interactive explanation that anticipates follow-up questions
     * @param {string} termKey - The term to explain
     * @param {string} context - Optional context for the explanation
     * @returns {Object} Detailed explanation with anticipated questions
     */
    async explainInteractive(termKey, context = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return {error: "Cannot explain an empty term."};
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            if (context) {
                prompt = `Context: ${context}
Term: ${termKey}

Provide a clear explanation of "${termKey}" and anticipate 3-5 follow-up questions a curious learner might ask, along with brief answers:

Explanation:
[clear explanation]

Anticipated Questions:
1. [question 1]
   [answer 1]
2. [question 2]
   [answer 2]
3. [question 3]
   [answer 3]`;
            } else {
                prompt = `Provide a clear explanation of "${termKey}" and anticipate 3-5 follow-up questions a curious learner might ask, along with brief answers:

Explanation:
[clear explanation]

Anticipated Questions:
1. [question 1]
   [answer 1]
2. [question 2]
   [answer 2]
3. [question 3]
   [answer 3]`;
            }

            const result = await generator(prompt, {
                max_new_tokens: 300,
                temperature: 0.6,
            max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const explanationText = result[0].generated_text.replace(prompt, '').trim();
                
                // Parse the explanation and questions
                const lines = explanationText.split('\n');
                let inExplanation = false;
                let inQuestions = false;
                let explanation = '';
                const questions = [];
                let currentQuestion = null;
                
                for (const line of lines) {
                    if (line.startsWith('Explanation:')) {
                        inExplanation = true;
                        inQuestions = false;
                    } else if (line.startsWith('Anticipated Questions:')) {
                        inExplanation = false;
                        inQuestions = true;
                    } else if (inExplanation && line.trim() !== '') {
                        explanation += line.trim() + ' ';
                    } else if (inQuestions) {
                        const questionMatch = line.match(/^(\d+)\.\s*(.+)$/);
                        if (questionMatch) {
                            if (currentQuestion) {
                                questions.push(currentQuestion);
                            }
                            currentQuestion = {
                                question: questionMatch[2].trim(),
                                answer: ''
                            };
                        } else if (line.startsWith('   ') && currentQuestion) {
                            currentQuestion.answer += line.substring(3).trim() + ' ';
                        }
                    }
                }
                
                // Add the last question
                if (currentQuestion) {
                    currentQuestion.answer = currentQuestion.answer.trim();
                    questions.push(currentQuestion);
                }
                
                return {
                    term: termKey,
                    explanation: explanation.trim(),
                    anticipatedQuestions: questions
                };
            }

            return {error: `I can't provide an interactive explanation for "${termKey}" at the moment.`};
        } catch (error) {
            console.error('Error generating interactive explanation:', error);
            return {error: `Error generating interactive explanation for "${termKey}": ${error.message}`};
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
            max_length: 1024,
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

    async generateAnalogies(termKey, numAnalogies = 3) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return [];
        }

        try {
            const generator = await this.getGenerationPipeline();

            const prompt = `Provide ${numAnalogies} analogies for "${termKey}" in the format:
1. [analogy]
2. [analogy]
3. [analogy]

Analogies for "${termKey}":`;

            const result = await generator(prompt, {
                max_new_tokens: 150,
                temperature: 0.7,
                max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const analogiesText = result[0].generated_text.replace(prompt, '').trim();
                const analogies = [];
                const lines = analogiesText.split('\n');
                
                for (const line of lines) {
                    const match = line.match(/^\d+\.\s*(.+)$/);
                    if (match) {
                        analogies.push(match[1].trim());
                    }
                }
                
                return analogies;
            }

            return [];
        } catch (error) {
            console.error('Error generating analogies:', error);
            return [];
        }
    }

    /**
     * Generate a counterfactual explanation that explores alternative scenarios
     * @param {string} termKey - The term to explain
     * @param {string} context - Optional context for the explanation
     * @returns {Object} Detailed counterfactual explanation
     */
    async explainCounterfactual(termKey, context = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return {error: "Cannot explain an empty term."};
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            if (context) {
                prompt = `Context: ${context}
Term: ${termKey}

Explain "${termKey}" by exploring counterfactual scenarios. For each scenario, describe what would be different if a key assumption were changed:

Explanation:
[main explanation]

Counterfactual Scenarios:
1. [scenario 1]: [description of how this would change the concept]
2. [scenario 2]: [description of how this would change the concept]
3. [scenario 3]: [description of how this would change the concept]`;
            } else {
                prompt = `Explain "${termKey}" by exploring counterfactual scenarios. For each scenario, describe what would be different if a key assumption were changed:

Explanation:
[main explanation]

Counterfactual Scenarios:
1. [scenario 1]: [description of how this would change the concept]
2. [scenario 2]: [description of how this would change the concept]
3. [scenario 3]: [description of how this would change the concept]`;
            }

            const result = await generator(prompt, {
                max_new_tokens: 300,
                temperature: 0.7,
                max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                const explanationText = result[0].generated_text.replace(prompt, '').trim();
                
                // Parse the explanation and scenarios
                const lines = explanationText.split('\n');
                let inExplanation = false;
                let inScenarios = false;
                let explanation = '';
                const scenarios = [];
                let currentScenario = null;
                
                for (const line of lines) {
                    if (line.startsWith('Explanation:')) {
                        inExplanation = true;
                        inScenarios = false;
                    } else if (line.startsWith('Counterfactual Scenarios:')) {
                        inExplanation = false;
                        inScenarios = true;
                    } else if (inExplanation && line.trim() !== '') {
                        explanation += line.trim() + ' ';
                    } else if (inScenarios) {
                        const scenarioMatch = line.match(/^(\d+)\.\s*(.+):\s*(.+)$/);
                        if (scenarioMatch) {
                            scenarios.push({
                                scenario: scenarioMatch[2].trim(),
                                description: scenarioMatch[3].trim()
                            });
                        }
                    }
                }
                
                return {
                    term: termKey,
                    explanation: explanation.trim(),
                    counterfactualScenarios: scenarios
                };
            }

            return {error: `I can't provide a counterfactual explanation for "${termKey}" at the moment.`};
        } catch (error) {
            console.error('Error generating counterfactual explanation:', error);
            return {error: `Error generating counterfactual explanation for "${termKey}": ${error.message}`};
        }
    }

    async answerQuestion(question, context = null) {
        if (typeof question !== 'string' || question.length === 0) {
            return "Cannot answer an empty question.";
        }

        try {
            // Use the QA pipeline for factual questions
            if (context) {
                const qaPipeline = await this.getQAPipeline();
                const result = await qaPipeline(question, context);
                
                if (result && result.answer) {
                    return result.answer;
                }
            }
            
            // Fall back to generation pipeline for more complex questions
            const generator = await this.getGenerationPipeline();
            const prompt = context 
                ? `Context: ${context}
Question: ${question}
Answer:`
                : `Question: ${question}
Answer:`;
                
            const result = await generator(prompt, {
                max_new_tokens: 100,
                temperature: 0.5,
            max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                return result[0].generated_text.replace(prompt, '').trim();
            }

            return `I cannot answer the question "${question}" at the moment.`;
        } catch (error) {
            console.error('Error answering question:', error);
            return `Error answering question "${question}": ${error.message}`;
        }
    }

    /**
     * Generate an explanation tailored to a specific audience level
     * @param {string} termKey - The term to explain
     * @param {string} audience - The target audience (beginner, intermediate, expert)
     * @param {string} context - Optional context for the explanation
     * @returns {string} Tailored explanation
     */
    async explainForAudience(termKey, audience = 'intermediate', context = null) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            return "Cannot explain an empty term.";
        }

        const validAudiences = ['beginner', 'intermediate', 'expert'];
        if (!validAudiences.includes(audience)) {
            return `Invalid audience level. Please choose from: ${validAudiences.join(', ')}`;
        }

        try {
            const generator = await this.getGenerationPipeline();

            let prompt;
            switch (audience) {
                case 'beginner':
                    prompt = `Explain "${termKey}" in simple terms for a beginner${context ? ` in the context of ${context}` : ''}. Avoid technical jargon and use everyday language:`;
                    break;
                case 'expert':
                    prompt = `Explain "${termKey}" in technical detail for an expert${context ? ` in the context of ${context}` : ''}. Use precise terminology and assume deep domain knowledge:`;
                    break;
                case 'intermediate':
                default:
                    prompt = `Explain "${termKey}" for someone with some familiarity with the topic${context ? ` in the context of ${context}` : ''}. Use clear language while including relevant technical details:`;
                    break;
            }

            const result = await generator(prompt, {
                max_new_tokens: 150,
                temperature: 0.6,
            max_length: 1024,
                do_sample: true
            });

            if (result && result[0] && result[0].generated_text) {
                return result[0].generated_text.replace(prompt, '').trim();
            }

            return `I can't provide a ${audience}-level explanation for "${termKey}" at the moment.`;
        } catch (error) {
            console.error(`Error generating ${audience}-level explanation:`, error);
            return `Error generating ${audience}-level explanation for "${termKey}": ${error.message}`;
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
