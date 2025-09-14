import {info} from '../utils/logger.js';

class PipelineFactory {
    #pipelines;

    constructor() {
        this.#pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}-${model}`;
        if (!this.#pipelines.has(key)) {
            info(`Loading pipeline: ${type} - ${model}`);
            const {pipeline} = await import('@xenova/transformers');
            this.#pipelines.set(key, pipeline(type, model, options));
        }
        return this.#pipelines.get(key);
    }

    dispose() {
        info('Disposing all pipelines');
        this.#pipelines.clear();
    }
}

export default PipelineFactory;
