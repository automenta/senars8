import {env} from '@xenova/transformers';

// Suppress ONNX runtime warnings by setting the log level to fatal.
env.logLevel = 'fatal';

/**
 * Setup file for tests
 * This file is run before all tests
 */

// Add any global setup here
// For example, setting up mocks, global variables, or test utilities