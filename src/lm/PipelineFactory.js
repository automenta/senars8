const { info } = require('../utils/logger');

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}-${model}`;
        if (!this._pipelines.has(key)) {
            info(`Loading pipeline: ${type} - ${model}`);
            const { pipeline } = await import('@xenova/transformers');
            this._pipelines.set(key, pipeline(type, model, options));
        }
        return this._pipelines.get(key);
    }

    dispose() {
        info('Disposing all pipelines');
        this._pipelines.clear();
    }
}

module.exports = PipelineFactory;
