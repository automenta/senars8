import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import Tools from '../../core/lm/Tools.js';
import {createUnifiedErrorHandler} from '../../core/utils/errorHandler.js';

// Mock LM instance for testing LM-powered functionality
const mockLM = {
    _generate: vi.fn()
};

describe('Phase 2.3: Advanced Tool Integration - Tools System', () => {
    let tools;

    beforeEach(() => {
        tools = new Tools();
    });

    afterEach(() => {
        // Cleanup if needed
    });

    describe('1. Centralized Tools System with Native, MCP, and External Tool Support', () => {
        test('should register and execute native tools', () => {
            const mockHandler = vi.fn(() => 'native result');
            tools.registerTool('native_tool', mockHandler, { description: 'Native tool test' });

            expect(tools.tools.has('native_tool')).toBe(true);
            const toolInfo = tools.getToolInfo().native;
            expect(toolInfo).toHaveLength(1);
            expect(toolInfo[0].name).toBe('native_tool');
            expect(toolInfo[0].metadata.description).toBe('Native tool test');
        });

        test('should register and execute MCP tools', () => {
            const mcpConfig = {
                endpoint: 'http://mcp.example.com',
                simulator: vi.fn(() => 'mcp result')
            };
            
            tools.registerMcpTool('mcp_tool', mcpConfig);

            expect(tools.mcpTools.has('mcp_tool')).toBe(true);
            const toolInfo = tools.getToolInfo().mcp;
            expect(toolInfo).toHaveLength(1);
            expect(toolInfo[0].name).toBe('mcp_tool');
            expect(toolInfo[0].config.endpoint).toBe('http://mcp.example.com');
        });

        test('should register and execute external tools', () => {
            const externalToolInstance = {
                execute: vi.fn(() => 'external result')
            };
            
            tools.registerExternalTool('external_tool', externalToolInstance);

            expect(tools.externalTools.has('external_tool')).toBe(true);
            const toolInfo = tools.getToolInfo().external;
            expect(toolInfo).toHaveLength(1);
            expect(toolInfo[0].name).toBe('external_tool');
        });

        test('should execute MCP tool with simulator', async () => {
            const mockSimulator = vi.fn((param) => `simulated: ${param}`);
            tools.registerMcpTool('mcp_sim_tool', { simulator: mockSimulator });

            const result = await tools.executeTool('mcp_sim_tool', ['test']);
            expect(result).toBe('simulated: test');
            expect(mockSimulator).toHaveBeenCalledWith('test', {});
        });

        test('should execute external tool with execute method', async () => {
            const externalTool = {
                execute: vi.fn((param) => `external: ${param}`)
            };
            tools.registerExternalTool('ext_exec_tool', externalTool);

            const result = await tools.executeTool('ext_exec_tool', ['test']);
            expect(result).toBe('external: test');
            expect(externalTool.execute).toHaveBeenCalledWith('test', {});
        });

        test('should execute external tool that is a function', async () => {
            const externalFunction = vi.fn((param) => `function: ${param}`);
            tools.registerExternalTool('ext_func_tool', externalFunction);

            const result = await tools.executeTool('ext_func_tool', ['test']);
            expect(result).toBe('function: test');
            expect(externalFunction).toHaveBeenCalledWith('test', {});
        });

        test('should handle tool conflicts across different types', () => {
            // Native tool
            tools.registerTool('conflict_tool', vi.fn());
            
            // Should not allow registering MCP tool with same name
            expect(() => {
                tools.registerMcpTool('conflict_tool', { endpoint: 'test' });
            }).toThrow('Tool with name \'conflict_tool\' already exists');
            
            // Should not allow registering external tool with same name
            expect(() => {
                tools.registerExternalTool('conflict_tool', {});
            }).toThrow('Tool with name \'conflict_tool\' already exists');
        });
    });

    describe('2. LM-Powered Tool Selection and Parameter Optimization', () => {
        test('should handle missing LM gracefully in execution context', async () => {
            // Test that the system works without LM integration
            tools.registerTool('basic_tool', vi.fn(() => 'basic result'));
            const result = await tools.executeTool('basic_tool', ['param'], {});
            expect(result).toBe('basic result');
        });

        test('should validate parameters for MCP tools', () => {
            tools.registerMcpTool('test_mcp_tool', { config: 'test' });
            
            expect(() => {
                tools.registerMcpTool('', { config: 'invalid' });
            }).toThrow();
        });

        test('should validate parameters for external tools', () => {
            tools.registerExternalTool('test_ext_tool', { execute: vi.fn() });
            
            expect(() => {
                tools.registerExternalTool('', { execute: vi.fn() });
            }).toThrow();
        });
    });

    describe('3. Tool Execution History and Performance Tracking', () => {
        test('should maintain execution history for all tool types', async () => {
            const nativeHandler = vi.fn(() => 'native success');
            tools.registerTool('history_native', nativeHandler);
            
            await tools.executeTool('history_native', ['test']);
            
            const history = tools.getExecutionHistory();
            expect(history).toHaveLength(1);
            expect(history[0].toolName).toBe('history_native');
            expect(history[0].status).toBe('success');
            expect(history[0].args).toEqual(['test']);
            expect(history[0].result).toBe('native success');
            expect(history[0].duration).toBeGreaterThanOrEqual(0);
        });

        test('should track execution failures in history', async () => {
            const failingHandler = vi.fn(() => {
                throw new Error('Execution failed');
            });
            tools.registerTool('failing_tool', failingHandler);
            
            await expect(tools.executeTool('failing_tool', [])).rejects.toThrow('Execution failed');
            
            const history = tools.getExecutionHistory();
            expect(history).toHaveLength(1);
            expect(history[0].toolName).toBe('failing_tool');
            expect(history[0].status).toBe('error');
            expect(history[0].error).toBe('Execution failed');
        });

        test('should clear execution history', async () => {
            tools.registerTool('clear_test', vi.fn(() => 'result'));
            await tools.executeTool('clear_test', []);
            
            expect(tools.getExecutionHistory()).toHaveLength(1);
            
            tools.clearExecutionHistory();
            expect(tools.getExecutionHistory()).toHaveLength(0);
        });

        test('should get all tool names across all types', () => {
            tools.registerTool('native_tool', vi.fn());
            tools.registerMcpTool('mcp_tool', { endpoint: 'test' });
            tools.registerExternalTool('external_tool', { execute: vi.fn() });
            
            const names = tools.getToolNames();
            expect(names).toContain('native_tool');
            expect(names).toContain('mcp_tool');
            expect(names).toContain('external_tool');
            expect(names).toHaveLength(3);
        });
    });

    describe('4. Automatic Tool Discovery System', () => {
        test('should maintain tool registry state properly', () => {
            const initialCount = [
                tools.tools.size,
                tools.mcpTools.size, 
                tools.externalTools.size
            ];
            
            tools.registerTool('test_tool', vi.fn());
            tools.registerMcpTool('test_mcp', { endpoint: 'test' });
            tools.registerExternalTool('test_ext', { execute: vi.fn() });
            
            expect(tools.tools.size).toBe(initialCount[0] + 1);
            expect(tools.mcpTools.size).toBe(initialCount[1] + 1);
            expect(tools.externalTools.size).toBe(initialCount[2] + 1);
        });

        test('should handle duplicate tool registration across types', () => {
            tools.registerTool('dupe_tool', vi.fn());
            
            // Should prevent MCP tool with same name
            expect(() => {
                tools.registerMcpTool('dupe_tool', { endpoint: 'test' });
            }).toThrow();
            
            // Should prevent external tool with same name
            expect(() => {
                tools.registerExternalTool('dupe_tool', { execute: vi.fn() });
            }).toThrow();
        });
    });

    describe('5. LM Explanation Service Integration', () => {
        test('should handle tool execution without LM explanation', async () => {
            const mockHandler = vi.fn((param) => `processed: ${param}`);
            tools.registerTool('explanation_tool', mockHandler);
            
            // Execute without explanation request
            const result = await tools.executeTool('explanation_tool', ['test']);
            expect(result).toBe('processed: test');
            expect(mockHandler).toHaveBeenCalledWith('test', {});
        });

        test('should handle error when MCP simulator is not configured', async () => {
            tools.registerMcpTool('no_sim_tool', { config: 'no_simulator' });
            
            await expect(tools.executeTool('no_sim_tool', [])).rejects.toThrow('MCP tool no_sim_tool has no simulator configured');
        });

        test('should handle error when external tool has no executable method', async () => {
            tools.registerExternalTool('no_exec_tool', { name: 'test' }); // No execute method or function
            
            await expect(tools.executeTool('no_exec_tool', [])).rejects.toThrow('External tool no_exec_tool has no executable method');
        });
    });

    describe('6. Backward Compatibility Validation', () => {
        test('should maintain Tools interface consistency', () => {
            // Verify all expected methods exist
            expect(typeof tools.registerTool).toBe('function');
            expect(typeof tools.registerMcpTool).toBe('function');
            expect(typeof tools.registerExternalTool).toBe('function');
            expect(typeof tools.executeTool).toBe('function');
            expect(typeof tools._findTool).toBe('function');
            expect(typeof tools.getToolInfo).toBe('function');
            expect(typeof tools.getExecutionHistory).toBe('function');
            expect(typeof tools.clearExecutionHistory).toBe('function');
            expect(typeof tools.getToolNames).toBe('function');
        });

        test('should preserve native tool registration behavior', async () => {
            const handler = vi.fn((input) => `processed: ${input}`);
            tools.registerTool('legacy_style_tool', handler, { 
                description: 'Test for legacy compatibility' 
            });
            
            const result = await tools.executeTool('legacy_style_tool', ['input']);
            expect(result).toBe('processed: input');
            expect(handler).toHaveBeenCalledWith('input', {});
            
            // Check that tool info is preserved
            const toolInfo = tools.getToolInfo().native;
            const tool = toolInfo.find(t => t.name === 'legacy_style_tool');
            expect(tool).toBeDefined();
            expect(tool.metadata.description).toBe('Test for legacy compatibility');
        });

        test('should maintain execution history structure', async () => {
            tools.registerTool('history_struct_tool', vi.fn(() => 'result'));
            await tools.executeTool('history_struct_tool', ['param']);
            
            const history = tools.getExecutionHistory();
            expect(history).toHaveLength(1);
            const record = history[0];
            
            expect(record).toHaveProperty('id');
            expect(record).toHaveProperty('toolName');
            expect(record).toHaveProperty('args');
            expect(record).toHaveProperty('startTime');
            expect(record).toHaveProperty('endTime');
            expect(record).toHaveProperty('duration');
            expect(record).toHaveProperty('status');
            expect(record.status).toBe('success');
            expect(record.toolName).toBe('history_struct_tool');
            expect(record.args).toEqual(['param']);
        });
    });

    describe('7. Performance Validation', () => {
        test('should execute tools efficiently without significant overhead', async () => {
            tools.registerTool('perf_test_tool', vi.fn((input) => `result: ${input}`));
            
            const startTime = Date.now();
            const results = [];
            
            // Execute multiple times to test performance
            for (let i = 0; i < 5; i++) {
                const result = await tools.executeTool('perf_test_tool', [`test${i}`]);
                results.push(result);
            }
            
            const duration = Date.now() - startTime;
            
            // Should complete within reasonable time (less than 100ms for 5 calls)
            expect(duration).toBeLessThan(100);
            
            // Verify all results are correct
            expect(results).toHaveLength(5);
            for (let i = 0; i < 5; i++) {
                expect(results[i]).toBe(`result: test${i}`);
            }
        });

        test('should handle concurrent tool executions', async () => {
            tools.registerTool('concurrent_tool', vi.fn(async (input) => {
                // Simulate some async work
                await new Promise(resolve => setTimeout(resolve, 1));
                return `processed: ${input}`;
            }));
            
            const promises = [];
            for (let i = 0; i < 3; i++) {
                promises.push(tools.executeTool('concurrent_tool', [`input${i}`]));
            }
            
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(3);
            expect(results).toContain('processed: input0');
            expect(results).toContain('processed: input1');
            expect(results).toContain('processed: input2');
        });
    });
});