import { describe, it, beforeEach, afterEach } from 'vitest';
import EnhancedToolManager from '../EnhancedToolManager.js';

describe('EnhancedToolManager - LM-Powered Tool Selection', () => {
    let toolManager;
    let mockLM;
    let mockCore;

    beforeEach(() => {
        // Mock core object for testing
        mockCore = {
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

        // Mock LM instance for testing
        mockLM = {
            _generate: async (prompt, options) => {
                if (prompt.includes('Select the most appropriate tool')) {
                    return '{"toolName": "file_read", "confidence": 0.85, "reasoning": "File reading is the most appropriate for this task"}';
                }
                if (prompt.includes('Provide a clear explanation')) {
                    return 'This tool was selected because it matches the file reading requirement in the task description.';
                }
                return '{}';
            }
        };

        toolManager = new EnhancedToolManager(mockCore, {
            enhanced: true,
            lmIntegration: true,
            autoDiscovery: true
        }, mockLM);
    });

    afterEach(async () => {
        if (toolManager) {
            await toolManager.shutdown();
        }
    });

    it('should select optimal tool using LM when available', async () => {
        const taskDescription = 'Read the contents of a file named "test.txt"';
        const selection = await toolManager.selectOptimalTool(taskDescription);

        expect(selection).toBeDefined();
        expect(selection.tool).toBeDefined();
        expect(selection.confidence).toBeGreaterThan(0);
        expect(selection.reasoning).toBeDefined();
    });

    it('should fallback to simple matching when LM fails', async () => {
        // Test with LM that throws error
        const failingLM = {
            _generate: async () => { throw new Error('LM unavailable'); }
        };

        const fallbackManager = new EnhancedToolManager(mockCore, {}, failingLM);

        // First register a file_read tool for fallback to work
        fallbackManager.registerTool({
            name: 'file_read',
            description: 'Read file content',
            category: 'file',
            parameters: {type: 'object', properties: {path: {type: 'string'}}},
            handler: async () => ({success: true, result: 'test content'})
        });

        const taskDescription = 'Read file content';
        const selection = await fallbackManager.selectOptimalTool(taskDescription);

        expect(selection).toBeDefined();
        expect(selection.tool).toBeDefined();
        expect(selection.confidence).toBeGreaterThan(0);
        expect(selection.reasoning).toBeDefined();
    });

    it('should use cached results for repeated requests', async () => {
        const taskDescription = 'Read file content';
        const startTime = Date.now();

        // First call
        await toolManager.selectOptimalTool(taskDescription);

        // Second call should be faster (cached)
        const secondStartTime = Date.now();
        await toolManager.selectOptimalTool(taskDescription);
        const secondDuration = Date.now() - secondStartTime;

        // Second call should be significantly faster due to caching
        expect(secondDuration).toBeLessThan(10); // Less than 10ms for cache lookup
    });
});