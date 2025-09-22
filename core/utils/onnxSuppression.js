import {env} from '@xenova/transformers';

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

    env.logLevel = 'fatal';

    if (env.backends?.onnx) {
        env.backends.onnx.logLevel = 'fatal';
        if (env.backends.onnx.env) {
            env.backends.onnx.env.logLevel = 'fatal';
            if (env.backends.onnx.env.wasm) {
                env.backends.onnx.env.wasm.numThreads = 1;
            }
        }
    }
    
    // Additional suppression for ONNX Runtime warnings
    if (typeof console !== 'undefined') {
        // Store original console.warn
        const originalWarn = console.warn;
        // Override console.warn to filter out ONNX Runtime warnings
        console.warn = function(...args) {
            // Check if the warning is from ONNX Runtime
            if (args.some(arg => typeof arg === 'string' && arg.includes('[W:onnxruntime'))) {
                // Suppress these warnings
                return;
            }
            // Call original warn for other warnings
            return originalWarn.apply(console, args);
        };
    }
}

export default {
    suppressOnnxWarnings
};