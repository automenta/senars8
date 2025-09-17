import {pipeline} from '@xenova/transformers';
import {info, warn} from '../utils/logger.js';
import {createModuleErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createModuleErrorHandler('PipelineFactory');

class PipelineFactory {
    constructor() {
        this._pipelines = new Map();
    }

    async get(type, model, options = {}) {
        const key = `${type}|${model}`;
        let pipelinePromise = this._pipelines.get(key);

        if (!pipelinePromise) {
            info(`Loading pipeline: ${type} - ${model}`, { module: 'lm/PipelineFactory' });
            pipelinePromise = errorHandler.safeSync(() => {
                // Create the pipeline promise and store it immediately.
                const promise = pipeline(type, model, {
                    ...options,
                    progress_callback: _progress => {
                        // console.log(_progress);
                    }
                });
                this._pipelines.set(key, promise);
                return promise;
            }, `create-pipeline-promise-${key}`, null);
        }

        return errorHandler.safeAsync(async () => {
            // Await the promise (either the one we just created or the one from the cache)
            const resolvedPipeline = await pipelinePromise;
            // Replace the promise with the resolved pipeline for future calls
            this._pipelines.set(key, resolvedPipeline);
            return resolvedPipeline;
        }, `resolve-pipeline-promise-${key}`, null);
    }

    dispose() {
        // This method is important for cleaning up resources,
        // but its implementation will depend on the specific models and libraries used.
        this._pipelines.clear();
        info('All pipelines disposed.', { module: 'lm/PipelineFactory' });
    }
}

export default new PipelineFactory();
