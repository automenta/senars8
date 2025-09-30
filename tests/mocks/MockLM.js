import Term from '../../core/core/Term.js';

class MockLM {
    constructor() {
        this.nlp = {
            parse: async () => []
        };
    }

    async getFeaturePipeline() {
        return () => ({
            data: []
        });
    }

    async getGenerationPipeline() {
        return () => "";
    }

    async _getQAPipeline() {
        return () => ({
            answer: ""
        });
    }

    async bootstrapTerm(termKey) {
        // Return a proper Term instance
        return new Term(termKey);
    }

    setReasoner() {
    }

    setMemory() {
    }

    startEmbeddingProcessor() {
    }

    stopEmbeddingProcessor() {
    }

    processEmbeddingQueue() {
    }

    generateHypotheses() {
        return [];
    }

    evaluateAndRankHypotheses() {
        return [];
    }

    refineHypothesis() {
        return null;
    }

    explain() {
        return "";
    }

    answerQuestion() {
        return "";
    }

    suggestPlanRepair() {
        return null;
    }

    proactiveEnrichment() {
        return [];
    }

    getPipelineStatistics() {
        return {
            pipelineCount: 0
        };
    }

    dispose() {
    }
}

export default MockLM;