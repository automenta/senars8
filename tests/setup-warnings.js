const originalEmitWarning = process.emitWarning;

process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('onnxruntime')) {
        return;
    }
    originalEmitWarning(warning, ...args);
};