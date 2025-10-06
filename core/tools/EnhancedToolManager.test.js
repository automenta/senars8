import {describe, it, beforeEach, afterEach} from 'vitest';
import EnhancedToolManager from './EnhancedToolManager.js';
import ToolManagerFactory from './ToolManagerFactory.js';
import CompatibilityAdapter from './CompatibilityAdapter.js';

/**
 * Comprehensive tests for EnhancedToolManager Phase 2.3 implementation
 */
describe('EnhancedToolManager Phase 2.3', () => {
    let toolManager;
    let mockLM;

    beforeEach(() => {
        // Mock LM instance for testing
        mockLM = {
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
        };

        toolManager = new EnhancedToolManager({
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

    describe('LM-Powered Tool Selection', () => {
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

            const fallbackManager = new EnhancedToolManager({}, failingLM);

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

    describe('Parameter Optimization', () => {
        it('should optimize parameters using LM', async () => {
            const tool = {name: 'file_read'};
            const initialParams = {path: 'test.txt'};
            const context = {priority: 'high'};

            const optimized = await toolManager.optimizeParameters(tool, initialParams, context);

            expect(optimized).toBeDefined();
            expect(optimized.path).toBe('test.txt'); // Original preserved
            expect(optimized.encoding).toBe('utf8'); // LM suggestion added
        });

        it('should return original parameters when LM unavailable', async () => {
            const noLMManager = new EnhancedToolManager({lmIntegration: false});
            const tool = {name: 'file_read'};
            const initialParams = {path: 'test.txt'};

            const result = await noLMManager.optimizeParameters(tool, initialParams);

            expect(result).toEqual(initialParams);
        });
    });

    describe('Enhanced Execution Tracking', () => {
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

    describe('LM Explanation Integration', () => {
        it('should generate explanations when requested', async () => {
            // Register a mock tool first
            toolManager.registerTool({
                name: 'test_tool',
                description: 'Test tool for explanation',
                category: 'test',
                parameters: {type: 'object', properties: {}},
                handler: async () => ({success: true, result: 'test'})
            });

            const result = await toolManager.executeToolWithEnhancements(
                'test_tool',
                {},
                {requestExplanation: true}
            );

            expect(result.explanation).toBeDefined();
            expect(typeof result.explanation).toBe('string');
        });

        it('should not generate explanations when not requested', async () => {
            // Register a mock tool first
            toolManager.registerTool({
                name: 'test_tool',
                description: 'Test tool for explanation',
                category: 'test',
                parameters: {type: 'object', properties: {}},
                handler: async () => ({success: true, result: 'test'})
            });

            const result = await toolManager.executeToolWithEnhancements(
                'test_tool',
                {},
                {requestExplanation: false}
            );

            expect(result.explanation).toBeUndefined();
        });
    });

    describe('Auto-Discovery System', () => {
        it('should initialize auto-discovery when enabled', () => {
            expect(toolManager.autoDiscoveryEnabled).toBe(true);
            expect(toolManager.discoveryInterval).toBeDefined();
        });

        it('should not start auto-discovery when disabled', () => {
            const noDiscoveryManager = new EnhancedToolManager({autoDiscovery: false});
            expect(noDiscoveryManager.discoveryInterval).toBeNull();
        });
    });

    describe('Factory Pattern', () => {
        it('should create EnhancedToolManager when LM available', () => {
            const manager = ToolManagerFactory.createToolManager(
                {enhanced: true},
                mockLM
            );

            expect(ToolManagerFactory.isEnhanced(manager)).toBe(true);
        });

        it('should create standard ToolSystem when no LM', () => {
            const manager = ToolManagerFactory.createToolManager({}, null);

            expect(ToolManagerFactory.isEnhanced(manager)).toBe(false);
        });
    });

    describe('Compatibility Adapter', () => {
        it('should provide backward compatible interface', async () => {
            const adapter = new CompatibilityAdapter({enhanced: true}, mockLM);

            // Should work with standard interface
            expect(typeof adapter.registerTool).toBe('function');
            expect(typeof adapter.executeTool).toBe('function');
            expect(typeof adapter.getTool).toBe('function');
            expect(typeof adapter.getStatistics).toBe('function');
        });

        it('should delegate enhanced features when available', async () => {
            const adapter = new CompatibilityAdapter({enhanced: true}, mockLM);

            expect(adapter.hasFeature('selectOptimalTool')).toBe(true);
            expect(adapter.hasFeature('optimizeParameters')).toBe(true);

            const selection = await adapter.selectOptimalTool('test task');
            expect(selection).toBeDefined();
        });

        it('should gracefully handle missing features', async () => {
            const adapter = new CompatibilityAdapter({}, null);

            expect(adapter.hasFeature('selectOptimalTool')).toBe(false);

            const result = await adapter.selectOptimalTool('test task');
            expect(result).toBeNull();
        });
    });

    describe('Performance Validation', () => {
        it('should not significantly degrade performance without LM', async () => {
            const standardManager = new EnhancedToolManager({lmIntegration: false});

            // Register a mock tool first
            standardManager.registerTool({
                name: 'test_tool',
                description: 'Test tool',
                category: 'test',
                parameters: {type: 'object', properties: {}},
                handler: async () => ({success: true, result: 'test'})
            });

            const startTime = Date.now();

            await standardManager.executeTool('test_tool', {});

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(100); // Should be fast without LM overhead
        });

        it('should maintain reasonable performance with LM integration', async () => {
            // Register a mock tool first
            toolManager.registerTool({
                name: 'test_tool',
                description: 'Test tool',
                category: 'test',
                parameters: {type: 'object', properties: {}},
                handler: async () => ({success: true, result: 'test'})
            });

            const startTime = Date.now();

            await toolManager.executeToolWithEnhancements(
                'test_tool',
                {},
                {requestExplanation: true}
            );

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should complete within reasonable time
        });
    });

    describe('Backward Compatibility', () => {
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
            const toolConfig = {
                name: 'test_tool',
                description: 'Test tool',
                parameters: {type: 'object', properties: {}},
                handler: async () => ({success: true, result: 'test'})
            };

            toolManager.registerTool(toolConfig);
            const result = await toolManager.executeTool('test_tool');

            // The ToolSystem wraps the handler result in a success wrapper
            expect(result).toEqual({
                success: true,
                executionId: expect.any(String),
                result: {success: true, result: 'test'},
                duration: expect.any(Number)
            });
        });
    });
});