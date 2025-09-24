import {pipeline} from '@xenova/transformers';
import {info} from '../utils/logger.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('PipelineFactory');

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}|${model}`;
        if (this._pipelines.has(key)) {
            return this._pipelines.get(key);
        }

        info(`Loading pipeline: ${type} - ${model}`);
        const newPipeline = await errorHandler.execute(
            () => pipeline(type, model, options),
            `create-pipeline-${key}`
        );

        if (newPipeline) {
            this._pipelines.set(key, newPipeline);
        }
        return newPipeline;
    }

    dispose() {
        this._pipelines.clear();
        info('All pipelines disposed.');
    }
}

export default new PipelineFactory();
