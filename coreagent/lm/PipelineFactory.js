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
            const cachedPipeline = this._pipelines.get(key);
            // Check if the cached pipeline is valid (is a function or has expected methods)
            if (cachedPipeline && (typeof cachedPipeline === 'function' || typeof cachedPipeline.call === 'function')) {
                return cachedPipeline;
            } else {
                // Remove invalid cached pipeline
                this._pipelines.delete(key);
            }
        }

        try {
            const {pipeline} = await import('@xenova/transformers');
    
            info(`Loading pipeline: ${type} - ${model}`);
            const newPipeline = await errorHandler.execute(
                () => pipeline(type, model, options),
                `create-pipeline-${key}`
            );
    
            // Only cache if the pipeline is valid (is a function or has expected call method)
            if (newPipeline && (typeof newPipeline === 'function' || typeof newPipeline.call === 'function')) {
                this._pipelines.set(key, newPipeline);
            }
            return newPipeline;
        } catch (error) {
            // Handle the specific ONNX runtime error
            if (error.code === 'ERR_DLOPEN_FAILED' && error.message.includes('did not self-register')) {
                console.warn(`ONNX runtime failed to load: ${error.message}. Transformers functionality unavailable.`);
                throw error; // Re-throw so calling code can handle it appropriately
            }
            // Re-throw other errors
            throw error;
        }
    }

    dispose() {
        this._pipelines.clear();
        info('All pipelines disposed.');
    }
}

export default new PipelineFactory();
