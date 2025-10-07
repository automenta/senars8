/**
 * Common test utilities for EnhancedToolManager tests
 * Provides shared mocks and setup to avoid duplication
 */

import EnhancedToolManager from '../EnhancedToolManager.js';

// Mock core object for testing
export const createMockCore = () => {
    const mockCore = {
        emit: () => {},
        messages: {
            handle: () => {},
            on: () => {},
            off: () => {}
        },
        config: {
            get: () => undefined,
            getNumber: () => 100,
            getString: () => 'test',
            getBoolean: () => false
        },
        components: new Map(),
        register: () => mockCore,
        get: () => null,
        on: () => {},
        request: () => null,
        rules: {
            getStats: () => ({ totalRules: 0 })
        }
    };
    return mockCore;
};

// Mock LM instance for testing
export const createMockLM = () => ({
    _generate: async (prompt, options) => {
        if (prompt.includes('Select the most appropriate tool')) {
            return '{"toolName": "file_read", "confidence": 0.85, "reasoning": "File reading is the most appropriate for this task"}';
        }
        if (prompt.includes('Optimize these parameters')) {
            return '```json\n{"encoding": "utf8", "maxSize": 5000000}\n```';
        }
        if (prompt.includes('Provide a clear explanation')) {
            return 'This tool was selected because it matches the file reading requirement in the task description.';
        }
        return '{}';
    }
});

// Failing LM for testing fallback scenarios
export const createFailingLM = () => ({
    _generate: async () => {
        throw new Error('LM unavailable');
    }
});

// Standard test setup for EnhancedToolManager
export const createTestManager = (coreOptions = {}, lmInstance = null) => {
    const mockCore = createMockCore();
    const mockLM = lmInstance || createMockLM();

    return new EnhancedToolManager(mockCore, {
        enhanced: true,
        lmIntegration: true,
        autoDiscovery: true,
        ...coreOptions
    }, mockLM);
};

// Test cleanup function
export const cleanupTestManager = async (toolManager) => {
    if (toolManager) {
        await toolManager.shutdown();
    }
};

// Common test tool configuration
export const createTestTool = (name = 'test_tool', category = 'test') => ({
    name,
    description: 'Test tool',
    category,
    parameters: { type: 'object', properties: {} },
    handler: async () => ({ success: true, result: 'test' })
});

// Common test tool for file operations
export const createFileReadTool = () => ({
    name: 'file_read',
    description: 'Read file content',
    category: 'file',
    parameters: { type: 'object', properties: { path: { type: 'string' } } },
    handler: async () => ({ success: true, result: 'test content' })
});