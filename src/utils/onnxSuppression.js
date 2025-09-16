import { env } from '@xenova/transformers';

// Suppress ONNX runtime warnings at the earliest possible point
// Set environment variables before ONNX runtime is initialized
if (typeof process !== 'undefined') {
    // Suppress ONNX Runtime C++ level warnings
    process.env.ORT_LOGGING_LEVEL = 'FATAL';
    
    // Additional environment variables to suppress warnings
    process.env.ORT_DEBUG_LOG_SEVERITY_LEVEL = '4'; // 4 = FATAL, 3 = ERROR, 2 = WARNING, 1 = INFO, 0 = VERBOSE
    process.env.ORT_LOGGING_HIDE_TIMESTAMPS = '1';
}

// Configure Transformers.js environment
env.logLevel = 'error';

// Configure ONNX runtime environment through transformers
if (env.backends?.onnx) {
    // Set log level for ONNX runtime
    env.backends.onnx.logLevel = 'error';
    
    // Additional ONNX runtime configuration to suppress warnings
    if (env.backends.onnx.env) {
        env.backends.onnx.env.logLevel = 'error';
        
        // Try to suppress graph optimization warnings
        if (env.backends.onnx.env.wasm) {
            // Reduce verbosity of WASM backend
            env.backends.onnx.env.wasm.numThreads = 1;
        }
    }
}

// Function to suppress warnings after initialization
export function suppressOnnxWarnings() {
    // This function is intentionally left empty for now
    // The main suppression is handled through environment variables
}

export default {
    suppressOnnxWarnings
};