import { describe, it, beforeEach, afterEach } from 'vitest';
import EnhancedToolManager from '../EnhancedToolManager.js';

describe('EnhancedToolManager - Enhanced Execution Tracking', () => {
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

    it('should track execution performance metrics', async () => {
        // Register a mock tool first
        toolManager.registerTool({
            name: 'test_tool',
            description: 'Test tool',
            category: 'test',
            parameters: {type: 'object', properties: {}},
            handler: async () => ({success: true, result: 'test'})
        });

        await toolManager.executeTool('test_tool', {});

        const stats = toolManager.getEnhancedStatistics();

        expect(stats.performanceMetrics).toBeDefined();
        expect(stats.performanceMetrics.totalExecutions).toBeGreaterThan(0);
        expect(stats.performanceMetrics.successfulExecutions).toBeGreaterThan(0);
        expect(stats.toolPerformance).toBeDefined();
        expect(stats.toolPerformance.test_tool).toBeDefined();
    });

    it('should track both successful and failed executions', async () => {
        // Register a mock tool first
        toolManager.registerTool({
            name: 'test_tool',
            description: 'Test tool',
            category: 'test',
            parameters: {type: 'object', properties: {}},
            handler: async () => ({success: true, result: 'test'})
        });

        // Successful execution
        await toolManager.executeTool('test_tool', {});

        // Failed execution (invalid tool)
        try {
            await toolManager.executeTool('nonexistent_tool', {});
        } catch (error) {
            // Expected to fail
        }

        const stats = toolManager.getEnhancedStatistics();
        expect(stats.performanceMetrics.successfulExecutions).toBe(1);
        expect(stats.performanceMetrics.failedExecutions).toBe(1);
    });
});