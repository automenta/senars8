import {env} from '@xenova/transformers';

/**
 * Suppresses verbose warnings from the ONNX runtime.
 * This is particularly useful for cleaning up console output during development and production.
 *
 * It is recommended to call this function once at the application's entry point
 * before any ONNX models are loaded.
 */
export function suppressOnnxWarnings() {
    try {
        // Set environment variables for ONNX Runtime
        if (typeof process !== 'undefined') {
            process.env.ORT_LOGGING_LEVEL = 'FATAL';
            process.env.ORT_DEBUG_LOG_SEVERITY_LEVEL = '4';
            process.env.ORT_LOGGING_HIDE_TIMESTAMPS = '1';
        }

        // Set log levels for transformers library
        env.logLevel = 'fatal';

        // Set log levels for ONNX backend specifically
        if (env.backends?.onnx) {
            env.backends.onnx.logLevel = 'fatal';
            if (env.backends.onnx.env) {
                env.backends.onnx.env.logLevel = 'fatal';
                if (env.backends.onnx.env.wasm) {
                    env.backends.onnx.env.wasm.numThreads = 1;
                }
            }
        }
        
        // Filter console warnings
        if (typeof console !== 'undefined' && console.warn) {
            const originalWarn = console.warn;
            console.warn = function(...args) {
                // Check if the warning is from ONNX Runtime
                if (args.some(arg => 
                    typeof arg === 'string' && 
                    (arg.includes('[W:onnxruntime') || 
                     arg.includes('Removing initializer') ||
                     arg.includes('CleanUnusedInitializersAndNodeArgs'))
                )) {
                    // Suppress these warnings
                    return;
                }
                // Call original warn for other warnings
                return originalWarn.apply(console, args);
            };
        }
    } catch (e) {
        // Ignore any errors in suppression
    }
}

export default {
    suppressOnnxWarnings
};