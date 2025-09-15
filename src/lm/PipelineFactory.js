import { pipeline, env } from '@xenova/transformers';
import { info, warn } from '../utils/logger.js';

// Suppress ONNX runtime warnings
env.logLevel = 'error';

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}|${model}`;
        let pipelinePromise = this._pipelines.get(key);

        if (!pipelinePromise) {
            info(`Loading pipeline: ${type} - ${model}`);
            try {
                // Create the pipeline promise and store it immediately.
                pipelinePromise = pipeline(type, model, {
                    ...options,
                    progress_callback: _progress => {
                        // console.log(_progress);
                    }
                });
                this._pipelines.set(key, pipelinePromise);
            } catch (error) {
                warn(`Failed to create pipeline promise for: ${key}`, error);
                this._pipelines.delete(key); // Clean up on synchronous error
                return null;
            }
        }

        try {
            // Await the promise (either the one we just created or the one from the cache)
            const resolvedPipeline = await pipelinePromise;
            // Replace the promise with the resolved pipeline for future calls
            this._pipelines.set(key, resolvedPipeline);
            return resolvedPipeline;
        } catch (error) {
            warn(`Failed to resolve pipeline promise for: ${key}`, error);
            // Remove the failed promise from the cache so we can try again later
            this._pipelines.delete(key);
            return null;
        }
    }

    dispose() {
        // This method is important for cleaning up resources,
        // but its implementation will depend on the specific models and libraries used.
        this._pipelines.clear();
        info('All pipelines disposed.');
    }
}

export default new PipelineFactory();
