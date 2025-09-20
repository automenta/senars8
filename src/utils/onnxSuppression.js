import { env } from '@xenova/transformers';

/**
 * Suppresses verbose warnings from the ONNX runtime.
 * This is particularly useful for cleaning up console output during development and production.
 *
 * It is recommended to call this function once at the application's entry point
 * before any ONNX models are loaded.
 *
 * This function sets the log level of the ONNX runtime to 'error', effectively
 * hiding informational and warning messages.
 */
export function suppressOnnxWarnings() {
    if (typeof process !== 'undefined') {
        process.env.ORT_LOGGING_LEVEL = 'FATAL';
        process.env.ORT_DEBUG_LOG_SEVERITY_LEVEL = '4';
        process.env.ORT_LOGGING_HIDE_TIMESTAMPS = '1';
    }

    env.logLevel = 'error';

    if (env.backends?.onnx) {
        env.backends.onnx.logLevel = 'error';
        if (env.backends.onnx.env) {
            env.backends.onnx.env.logLevel = 'error';
            if (env.backends.onnx.env.wasm) {
                env.backends.onnx.env.wasm.numThreads = 1;
            }
        }
    }
}

// Automatically execute the suppression function when this module is imported.
suppressOnnxWarnings();

export default {
    suppressOnnxWarnings
};