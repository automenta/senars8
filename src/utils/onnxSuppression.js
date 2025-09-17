import {env} from '@xenova/transformers';

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

export function suppressOnnxWarnings() {
}

export default {
    suppressOnnxWarnings
};