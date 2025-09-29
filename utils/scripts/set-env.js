// Comprehensive ONNX runtime warning suppression
process.env.ORT_LOGGING_LEVEL = 'FATAL';
process.env.ORT_DEBUG_LOG_SEVERITY_LEVEL = '4'; // 4 = FATAL, 3 = ERROR, 2 = WARNING, 1 = INFO, 0 = VERBOSE
process.env.ORT_LOGGING_HIDE_TIMESTAMPS = '1';
