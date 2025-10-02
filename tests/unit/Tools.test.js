import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import Tools from '../../core/lm/Tools.js';
import * as logger from '../../core/utils/logger.js';

describe('Tools', () => {
    let tools;
    let errorSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        });
        tools = new Tools();
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    test('should create a new Tools instance', () => {
        expect(tools).toBeInstanceOf(Tools);
        expect(tools.getToolInfo()).toEqual({
            native: [],
            mcp: [],
            external: []
        });
    });

    test('should register a native tool', () => {
        const mockHandler = vi.fn(() => 'result');
        tools.registerTool('test_tool', mockHandler, {description: 'Test tool'});

        const toolInfo = tools.getToolInfo();
        expect(toolInfo.native).toHaveLength(1);
        expect(toolInfo.native[0].name).toBe('test_tool');
        expect(toolInfo.native[0].metadata.description).toBe('Test tool');
    });

    test('should execute a registered native tool', async () => {
        const mockHandler = vi.fn((param) => `processed: ${param}`);
        tools.registerTool('process', mockHandler);

        const result = await tools.executeTool('process', ['test']);
        expect(result).toBe('processed: test');
        expect(mockHandler).toHaveBeenCalledWith('test', {});
    });

    test('should throw error for duplicate tool names', () => {
        const mockHandler1 = vi.fn();
        const mockHandler2 = vi.fn();

        tools.registerTool('duplicate_tool', mockHandler1);
        expect(() => {
            tools.registerTool('duplicate_tool', mockHandler2);
        }).toThrow('Tool with name \'duplicate_tool\' already exists');
    });

    test('should throw error for invalid tool name', () => {
        expect(() => {
            tools.registerTool('', vi.fn());
        }).toThrow('Tool name must be a non-empty string');
    });

    test('should throw error for non-function handler', () => {
        expect(() => {
            tools.registerTool('bad_tool', 'not_a_function');
        }).toThrow('Tool handler for bad_tool must be a function');
    });

    test('should throw error for invalid tool name in executeTool', async () => {
        await expect(tools.executeTool('', [])).rejects.toThrow('Tool name must be a non-empty string');
        await expect(tools.executeTool(null, [])).rejects.toThrow('Tool name must be a non-empty string');
    });

    test('should throw error for non-array args in executeTool', async () => {
        tools.registerTool('test_tool', vi.fn());
        await expect(tools.executeTool('test_tool', 'not_an_array')).rejects.toThrow('Arguments must be an array');
    });

    test('should throw error for unregistered tool', async () => {
        await expect(tools.executeTool('nonexistent_tool', [])).rejects.toThrow('Tool not found: nonexistent_tool');
    });

    test('should maintain execution history', async () => {
        const mockHandler = vi.fn(() => 'success');
        tools.registerTool('history_tool', mockHandler);

        await tools.executeTool('history_tool', ['param']);

        const history = tools.getExecutionHistory();
        expect(history).toHaveLength(1);
        expect(history[0].toolName).toBe('history_tool');
        expect(history[0].args).toEqual(['param']);
        expect(history[0].status).toBe('success');
        expect(history[0].result).toBe('success');
    });

    test('should handle tool execution errors', async () => {
        const errorHandler = vi.fn(() => {
            throw new Error('Tool execution failed');
        });
        tools.registerTool('failing_tool', errorHandler);

        await expect(tools.executeTool('failing_tool', [])).rejects.toThrow('Tool execution failed');

        const history = tools.getExecutionHistory();
        expect(history).toHaveLength(1);
        expect(history[0].status).toBe('error');
        expect(history[0].error).toBe('Tool execution failed');
    });

    test('should get all tool names', () => {
        tools.registerTool('tool1', vi.fn());
        tools.registerTool('tool2', vi.fn());

        const names = tools.getToolNames();
        expect(names).toContain('tool1');
        expect(names).toContain('tool2');
    });
});