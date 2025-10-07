/**
 * Simplified Language Model Mock for testing purposes
 * Focuses on providing realistic behavior without excessive mocking
 */
class MockLM {
    constructor(config = {}) {
        this.config = config;
        this.nlp = {
            parse: this.parse.bind(this)
        };
        this.termRegistry = new Map();
    }

    async parse(text) {
        // Simple parsing that returns tokens or empty array
        if (!text || typeof text !== 'string') {
            return [];
        }
        // Basic tokenization
        const tokens = text.trim().split(/\s+/);
        return tokens.map(token => ({token, type: 'word'}));
    }

    async getFeaturePipeline() {
        return (input) => {
            // Simple feature extraction
            return {
                data: Array.isArray(input) ? input : [input],
                features: input ? input.length : 0
            };
        };
    }

    async getGenerationPipeline() {
        return (input) => {
            // Simple generation that echoes input back
            return typeof input === 'string' ? `Generated: ${input}` : JSON.stringify(input);
        };
    }

    async _getQAPipeline() {
        return (question) => {
            // Simple response to common question patterns
            if (typeof question === 'string' && question.toLowerCase().includes('hello')) {
                return {answer: 'Hello! How can I help you?'};
            }
            return {answer: 'I understand your question.'};
        };
    }

    async bootstrapTerm(termKey) {
        if (!termKey) {
            throw new Error('Term key is required');
        }

        // Create a minimal term structure
        const term = {
            key: termKey,
            type: 'atomic',
            complexity: 1
        };

        this.termRegistry.set(termKey, term);
        return term;
    }

    setReasoner(reasoner) {
        this.reasoner = reasoner;
    }

    setMemory(memory) {
        this.memory = memory;
    }

    async startEmbeddingProcessor() {
        // No-op for testing
        return Promise.resolve();
    }

    async stopEmbeddingProcessor() {
        // No-op for testing
        return Promise.resolve();
    }

    async processEmbeddingQueue() {
        // No-op for testing
        return Promise.resolve();
    }

    async generateHypotheses(tasks) {
        if (!Array.isArray(tasks)) {
            return [];
        }

        // Generate simple hypotheses based on tasks
        return tasks.map((task, index) => ({
            id: `hyp_${index}`,
            task: task,
            confidence: 0.8
        }));
    }

    async evaluateAndRankHypotheses(hypotheses) {
        if (!Array.isArray(hypotheses)) {
            return [];
        }

        // Sort by confidence (descending)
        return hypotheses.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    }

    async refineHypothesis(hypothesis) {
        if (!hypothesis) {
            return null;
        }

        // Simple refinement that increases confidence slightly
        return {
            ...hypothesis,
            confidence: Math.min(0.95, (hypothesis.confidence || 0) + 0.05)
        };
    }

    async explain(task) {
        if (!task) {
            return 'No task to explain';
        }

        return `Explanation for task: ${task.termKey || 'unknown'}`;
    }

    async answerQuestion(question) {
        if (!question) {
            return 'No question provided';
        }

        return `Answer to: ${question}`;
    }

    async suggestPlanRepair(plan) {
        if (!plan) {
            return null;
        }

        // Return the plan unchanged for testing
        return plan;
    }

    async proactiveEnrichment(context) {
        if (!context) {
            return [];
        }

        return context.tasks ? context.tasks.slice(0, 2) : [];
    }

    getPipelineStatistics() {
        return {
            pipelineCount: 1,
            activePipelines: 1
        };
    }

    async dispose() {
        this.termRegistry.clear();
        this.reasoner = null;
        this.memory = null;
    }
}

export default MockLM;
