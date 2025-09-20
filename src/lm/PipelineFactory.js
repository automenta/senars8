import {pipeline} from '@xenova/transformers';
import {info} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';
import {suppressOnnxWarnings} from '../utils/onnxSuppression.js';

const errorHandler = createModuleErrorHandler('PipelineFactory');

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
        suppressOnnxWarnings();
    }

    async get(type, model, options = {}) {
        const key = `${type}|${model}`;
        if (this._pipelines.has(key)) {
            return this._pipelines.get(key);
        }

        info(`Loading pipeline: ${type} - ${model}`);
        const newPipeline = await errorHandler.safeAsync(
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
