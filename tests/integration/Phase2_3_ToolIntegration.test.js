import {describe, it, beforeEach, afterEach} from 'vitest';
import EnhancedToolManager from '../../core/tools/EnhancedToolManager.js';
import ToolManagerFactory from '../../core/tools/ToolManagerFactory.js';
import CompatibilityAdapter from '../../core/tools/CompatibilityAdapter.js';

describe('Phase 2.3: Advanced Tool Integration', () => {
    let toolManager;

    beforeEach(() => {
        toolManager = new EnhancedToolManager({
            enhanced: true,
            lmIntegration: false,
            autoDiscovery: false
        });
    });

    afterEach(async () => toolManager?.shutdown());

    const createTestTool = (name, category = 'test') => ({
        name,
        description: `${name} tool`,
        category,
        parameters: {type: 'object', properties: {}},
        handler: async () => ({success: true, result: name})
    });

    const createCategorizedTools = () => [
        createTestTool('web_tool', 'web'),
        createTestTool('file_tool', 'file'),
        createTestTool('api_tool', 'api')
    ];

    describe('Centralized Tools System Integration', () => {
        it('integrates native tool support', () => {
            toolManager.registerTool(createTestTool('test_native'));
            const retrieved = toolManager.getTool('test_native');
            expect(retrieved.name).toBe('test_native');
            expect(retrieved.category).toBe('test');
        });

        it('supports multiple tool categories', () => {
            const [initialWeb, initialFile, initialApi] = [
                'web', 'file', 'api'
            ].map(cat => toolManager.getToolsByCategory(cat).length);

            createCategorizedTools().forEach(tool => toolManager.registerTool(tool));

            expect(toolManager.getToolsByCategory('web')).toHaveLength(initialWeb + 1);
            expect(toolManager.getToolsByCategory('file')).toHaveLength(initialFile + 1);
            expect(toolManager.getToolsByCategory('api')).toHaveLength(initialApi + 1);
        });

        it('maintains tool registry state', () => {
            const initialCount = toolManager.getAllTools().length;
            toolManager.registerTool(createTestTool('state_test'));
            expect(toolManager.getAllTools()).toHaveLength(initialCount + 1);
        });
    });

    describe('LM-Powered Tool Selection', () => {
        it('falls back to pattern matching without LM', async () => {
            toolManager.registerTool(createTestTool('file_read', 'file'));
            const selection = await toolManager.selectOptimalTool('read file content');
            expect(selection.tool.name).toBe('file_read');
            expect(selection.confidence).toBeGreaterThan(0);
        });

        it('calculates relevance scores for tool matching', async () => {
            [createTestTool('file_read', 'file'), createTestTool('web_navigate', 'web')]
                .forEach(tool => toolManager.registerTool(tool));

            const fileSelection = await toolManager.selectOptimalTool('read file content');
            const webSelection = await toolManager.selectOptimalTool('browse website');

            expect(fileSelection.tool.name).toBe('file_read');
            expect(webSelection.tool.name).toBe('web_navigate');
        });

        it('caches tool selection results', async () => {
            toolManager.registerTool(createTestTool('cache_test'));
            await toolManager.selectOptimalTool('cache test');

            const startTime = Date.now();
            await toolManager.selectOptimalTool('cache test');
            expect(Date.now() - startTime).toBeLessThan(5);
        });
    });

    describe('Parameter Optimization', () => {
        it('returns original parameters without LM', async () => {
            const tool = {name: 'test_tool'};
            const params = {path: 'test.txt', encoding: 'utf8'};
            const result = await toolManager.optimizeParameters(tool, params, {priority: 'high'});
            expect(result).toEqual(params);
        });

        it('handles parameter optimization caching', async () => {
            const tool = {name: 'cache_tool'};
            const params = {test: 'value'};
            const context = {env: 'test'};

            const first = await toolManager.optimizeParameters(tool, params, context);
            const second = await toolManager.optimizeParameters(tool, params, context);
            expect(second).toEqual(first);
        });
    });

    describe('Execution History and Performance Tracking', () => {
        it('tracks execution metrics', async () => {
            toolManager.registerTool(createTestTool('metrics_test'));
            await toolManager.executeTool('metrics_test', {});

            const stats = toolManager.getEnhancedStatistics();
            expect(stats.performanceMetrics.totalExecutions).toBeGreaterThan(0);
            expect(stats.performanceMetrics.successfulExecutions).toBeGreaterThan(0);
        });

        it('maintains execution history', async () => {
            toolManager.registerTool(createTestTool('history_test'));
            await toolManager.executeTool('history_test', {});

            const history = toolManager.getExecutionHistory();
            expect(history.length).toBeGreaterThan(0);
            expect(history[0].toolName).toBe('history_test');
        });

        it('tracks tool-specific performance', async () => {
            toolManager.registerTool(createTestTool('perf_test'));
            await toolManager.executeTool('perf_test', {});

            const stats = toolManager.getEnhancedStatistics();
            expect(stats.toolPerformance.perf_test).toBeDefined();
            expect(stats.toolPerformance.perf_test.executions).toBe(1);
        });
    });

    describe('Automatic Tool Discovery System', () => {
        it('initializes discovery paths', () => {
            expect(toolManager.discoveryPaths).toContain('core/tools/executors');
            expect(toolManager.discoveryPaths).toContain('plugins');
        });

        it('tracks discovery state', () => {
            const stats = toolManager.getEnhancedStatistics();
            expect(stats.discoveryStats.pathsMonitored).toBeGreaterThan(0);
        });

        it('manages discovery timing', (done) => {
            const discoveryManager = new EnhancedToolManager({autoDiscovery: true});
            expect(discoveryManager.discoveryInterval).toBeDefined();

            setTimeout(() => {
                discoveryManager.stopAutoDiscovery();
                expect(discoveryManager.discoveryInterval).toBeNull();
                done();
            }, 100);
        });
    });

    describe('LM Explanation Service Integration', () => {
        it('handles missing LM gracefully', async () => {
            toolManager.registerTool(createTestTool('explain_test'));
            const result = await toolManager.executeToolWithEnhancements(
                'explain_test',
                {},
                {requestExplanation: true}
            );
            expect(result.success).toBe(true);
        });

        it('processes explanation requests', async () => {
            toolManager.registerTool(createTestTool('explanation_tool'));
            const result = await toolManager.executeToolWithEnhancements(
                'explanation_tool',
                {test: 'param'},
                {requestExplanation: true}
            );
            expect(result.success).toBe(true);
        });
    });

    describe('Backward Compatibility Validation', () => {
        it('maintains original ToolSystem interface', () => {
            [
                'registerTool', 'executeTool', 'getTool', 'getAllTools',
                'getToolsByCategory', 'getStatistics', 'getExecutionHistory', 'shutdown'
            ].forEach(method => expect(typeof toolManager[method]).toBe('function'));
        });

        it('preserves tool registration behavior', async () => {
            toolManager.registerTool(createTestTool('legacy_test'));
            const result = await toolManager.executeTool('legacy_test', {});

            expect(result.success).toBe(true);
            expect(result.executionId).toBeDefined();
            expect(result.duration).toBeDefined();
        });

        it('maintains statistics structure', () => {
            const stats = toolManager.getStatistics();
            expect(stats.totalTools).toBeDefined();
            expect(stats.totalExecutions).toBeDefined();
            expect(stats.successfulExecutions).toBeDefined();
            expect(stats.failedExecutions).toBeDefined();
        });
    });

    describe('Performance Degradation Validation', () => {
        it('executes without LM overhead', async () => {
            const noLMManager = new EnhancedToolManager({lmIntegration: false});
            noLMManager.registerTool(createTestTool('perf_tool'));

            const startTime = Date.now();
            await noLMManager.executeTool('perf_tool', {});
            expect(Date.now() - startTime).toBeLessThan(100);
        });

        it('handles multiple executions efficiently', async () => {
            toolManager.registerTool(createTestTool('multi_test'));

            const startTime = Date.now();
            for (let i = 0; i < 5; i++) {
                await toolManager.executeTool('multi_test', {iteration: i});
            }
            expect(Date.now() - startTime).toBeLessThan(500);
        });

        it('maintains cache performance', async () => {
            toolManager.registerTool(createTestTool('cache_perf'));

            const startTime = Date.now();
            for (let i = 0; i < 3; i++) {
                await toolManager.selectOptimalTool('cache performance test');
            }
            expect(Date.now() - startTime).toBeLessThan(200);
        });
    });

    describe('Factory Pattern Integration', () => {
        it('creates appropriate manager type', () => {
            const enhanced = ToolManagerFactory.createToolManager({enhanced: true, autoDiscovery: true});
            const standard = ToolManagerFactory.createToolManager({});

            expect(ToolManagerFactory.isEnhanced(enhanced)).toBe(true);
            expect(ToolManagerFactory.isEnhanced(standard)).toBe(false);
        });

        it('handles factory configuration', () => {
            const manager = ToolManagerFactory.createToolManager({enhanced: true, autoDiscovery: false});
            expect(manager).toBeDefined();
            expect(typeof manager.registerTool).toBe('function');
            expect(typeof manager.executeTool).toBe('function');
        });
    });

    describe('Compatibility Adapter', () => {
        it('provides unified interface', () => {
            const adapter = new CompatibilityAdapter({enhanced: true});
            expect(typeof adapter.registerTool).toBe('function');
            expect(typeof adapter.executeTool).toBe('function');
            expect(typeof adapter.getTool).toBe('function');
        });

        it('handles feature detection', () => {
            const fullAdapter = new CompatibilityAdapter({enhanced: true, autoDiscovery: true});
            const basicAdapter = new CompatibilityAdapter({});

            expect(fullAdapter.hasFeature('selectOptimalTool')).toBe(true);
            expect(basicAdapter.hasFeature('selectOptimalTool')).toBe(false);
        });

        it('delegates operations correctly', async () => {
            const adapter = new CompatibilityAdapter({enhanced: true});
            adapter.registerTool(createTestTool('adapter_test'));
            const result = await adapter.executeTool('adapter_test', {});
            expect(result.success).toBe(true);
        });
    });
});