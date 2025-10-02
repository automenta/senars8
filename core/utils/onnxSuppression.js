import {env} from '@xenova/transformers';

/**
 * Suppresses verbose warnings from the ONNX runtime.
 * This is particularly useful for cleaning up console output during development and production.
 *
 * It is recommended to call this function once at the application's entry point
 * before any ONNX models are loaded.
 */
export function suppressOnnxWarnings() {
    // Directly set the log level for the transformers library
    env.logLevel = 'fatal';
}

export default {
    suppressOnnxWarnings
};