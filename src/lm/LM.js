const { pipeline } = require('@xenova/transformers');
const Term = require("../core/Term");

class LM {
    constructor() {
        this._pipelinePromise = null;
    }

    getPipeline() {
        if (!this._pipelinePromise) {
            this._pipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        return this._pipelinePromise;
    }

    async bootstrapTerm(termKey) {
        if (typeof termKey !== 'string' || termKey.length === 0) {
            throw new Error('termKey must be a non-empty string.');
        }

        const extractor = await this.getPipeline();

        const output = await extractor(termKey, {
            pooling: 'mean',
            normalize: true,
        });

        const embeddingVector = Array.from(output.data);
        const complexity = termKey.split(/[(&,)/]/).filter(s => s.length > 0).length;
        return new Term(termKey, embeddingVector, complexity);
    }
}

module.exports = LM;
