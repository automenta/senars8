import { describe, it, beforeEach, afterEach } from 'vitest';
import EnhancedToolManager from '../EnhancedToolManager.js';
import { createMockCore, createTestTool, cleanupTestManager } from './test-utils.js';

describe('EnhancedToolManager - Backward Compatibility', () => {
    let toolManager;
    let mockCore;

    beforeEach(() => {
        mockCore = createMockCore();
        toolManager = new EnhancedToolManager(mockCore, {
            enhanced: true,
            lmIntegration: true,
            autoDiscovery: true
        });
    });

    afterEach(async () => {
        await cleanupTestManager(toolManager);
    });

    it('should maintain all original ToolSystem methods', () => {
        const originalMethods = [
            'registerTool', 'executeTool', 'getTool', 'getAllTools',
            'getToolsByCategory', 'getStatistics', 'getExecutionHistory', 'shutdown'
        ];

        for (const method of originalMethods) {
            expect(typeof toolManager[method]).toBe('function');
        }
    });

    it('should produce identical results to ToolSystem for basic operations', async () => {
        // Register a tool and execute it
        const toolConfig = createTestTool();

        toolManager.registerTool(toolConfig);
        const result = await toolManager.executeTool('test_tool');

        // The ToolSystem wraps the handler result in a success wrapper
        expect(result).toEqual({
            success: true,
            executionId: expect.any(String),
            result: { success: true, result: 'test' },
            duration: expect.any(Number)
        });
    });
});