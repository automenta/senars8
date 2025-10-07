import {beforeEach, describe, expect, it} from 'vitest';
import NarseseTranslator from '../../core/utils/NarseseTranslator.js';
import {parseTerm} from '../../core/parser/narseseParser.js';
import {createConfig} from '../shared/test-utils.js';
import {createTestSystem} from '../test-setup.js';

describe('Operation Operator (^) Integration', () => {
    let tools;
    let translator;
    let actionExecutor;

    beforeEach(() => {
        const systemData = createTestSystem(createConfig('UNIT_TEST'));
        const system = systemData.system;
        actionExecutor = system.actionExecutor;
        // Use actionExecutor directly instead of getting tools separately
        // The actionExecutor has all the methods we need directly
        translator = new NarseseTranslator();
    });

    it('should properly register and execute a native tool', async () => {
        // Register a tool using actionExecutor's direct method
        actionExecutor.registerTool('test_tool', async (param) => {
            return {result: `processed: ${param}`, success: true};
        });

        // Execute the tool using actionExecutor's method directly
        const result = await actionExecutor.executeNarseseOperation('test_tool(hello)');

        // The actual implementation returns a standardized format
        expect(result.result).toBeDefined();
        expect(result.result.action).toBe('test_tool');
        expect(result.result.result).toContain('hello'); // contains the processed result
        expect(result.result.success).toBe(true);
    });

    it('should parse operation terms with the ^ operator correctly', () => {
        // Test parsing of operation terms (function call syntax)
        const parsed = parseTerm('move(north)');
        expect(parsed.type).toBe('Operation');
        expect(parsed.subject.key).toBe('move');
        expect(parsed.predicate.type).toBe('Product');
        expect(parsed.predicate.terms).toHaveLength(1);
        expect(parsed.predicate.terms[0].key).toBe('north');
    });

    it('should extract arguments from Narsese goals correctly', () => {
        // Parse a Narsese operation term
        const parsedTerm = parseTerm('pickup(book, table)');

        // Extract arguments using the translator
        const extracted = translator.extractArgumentsFromGoal({term: parsedTerm});

        expect(extracted.operationName).toBe('pickup');
        expect(extracted.args).toEqual(['book', 'table']);
    });

    it('should convert JavaScript results to Narsese beliefs', () => {
        const result = {success: true, message: 'Operation completed'};
        const belief = translator.resultToNarseseBelief(result, 'test_operation');

        expect(belief.term).toContain('test_operation');
        expect(belief.punctuation).toBe('.');
        expect(belief.truth.frequency).toBe(0.9);
        expect(belief.truth.confidence).toBe(0.9);
    });

    it('should execute operations through ActionExecutor', async () => {
        // Use a unique tool name to avoid interference from other tests
        const uniqueToolName = `test_action_${Date.now()}`;

        // Register a test tool with the ActionExecutor
        actionExecutor.registerTool(uniqueToolName, async (param1, param2) => {
            return {
                success: true,
                action: uniqueToolName,
                params: [param1, param2],
                result: `executed with ${param1} and ${param2}`
            };
        });

        // Execute a Narsese operation directly
        const result = await actionExecutor.executeNarseseOperation(`${uniqueToolName}(hello, world)`);

        expect(result).toBeDefined();
        expect(result.result).toBeDefined();
        expect(result.result.success).toBe(true);
        expect(result.result.action).toBe(uniqueToolName);
        expect(result.result.params).toEqual(['hello', 'world']);
        expect(result.result.result).toContain('executed with hello and world');
    });

    it('should handle operation execution via operationTerm in executeAction', async () => {
        // Use a unique tool name to avoid interference from other tests
        const uniqueToolName = `move_${Date.now()}`;

        // Register a test tool
        actionExecutor.registerTool(uniqueToolName, async (direction) => {
            return {action: uniqueToolName, direction, success: true};
        });

        // Execute with operationTerm using the unique name
        const operationTermString = `${uniqueToolName}(north)`;
        const action = {
            operationTerm: parseTerm(operationTermString)
        };

        const result = await actionExecutor.executeAction(action);

        // The result should be an object with result and narseseBelief properties
        // (from _executeOperation return value)
        expect(result).toBeDefined();
        expect(result.result).toBeDefined();
        expect(result.result.action).toBe(uniqueToolName);
        expect(result.result.direction).toBe('north');
        expect(result.result.success).toBe(true);
    });

    it('should maintain proper execution history for operations', async () => {
        // Register a test tool
        actionExecutor.registerTool('history_test', async (param) => {
            return {param, success: true};
        });

        // Execute an operation
        await actionExecutor.executeNarseseOperation('history_test(test_value)');

        // Check history
        const history = actionExecutor.getActionHistory();
        const executionRecord = history.find(record => record.action === 'history_test');

        expect(executionRecord).toBeDefined();
        expect(executionRecord.action).toBe('history_test');
        expect(executionRecord.parameters).toEqual(['test_value']);
        expect(executionRecord.status).toBe('success');
        expect(executionRecord.type).toBe('operation');
    });

    it('should support bidirectional translation for complex operations', () => {
        const complexResult = {
            success: true,
            data: {location: 'kitchen', items: ['apple', 'banana']},
            timestamp: 1234567890
        };

        // Convert to Narsese belief
        const belief = translator.resultToNarseseBelief(complexResult, 'complex_operation');

        // Convert back to JavaScript value
        const jsValue = translator.narseseToValue(belief);

        expect(jsValue).toBeDefined();
        expect(jsValue.subject).toContain('complex_operation');
    });

    it('should register tools through ActionExecutor', async () => {
        // Register tool via ActionExecutor
        actionExecutor.registerTool('executor_tool', async (input) => {
            return {input, processed: true};
        });

        // Execute via ActionExecutor directly
        const result = await actionExecutor.executeNarseseOperation('executor_tool(test)');

        // The actual implementation returns a standardized format
        expect(result.result).toBeDefined();
        expect(result.result.action).toBe('executor_tool');
        expect(result.result.params).toContain('test');
        expect(result.result.success).toBe(true);
    });

    it('should handle multiple argument operations', async () => {
        // Register a tool that accepts multiple arguments
        actionExecutor.registerTool('complex_operation', async (arg1, arg2, arg3) => {
            return {
                operation: 'complex_operation',
                args: [arg1, arg2, arg3],
                combined: `${arg1}-${arg2}-${arg3}`
            };
        });

        // Parse and execute a complex operation
        const result = await actionExecutor.executeNarseseOperation('complex_operation(value1, value2, value3)');

        expect(result.result.operation).toBe('complex_operation');
        expect(result.result.args).toEqual(['value1', 'value2', 'value3']);
        expect(result.result.combined).toBe('value1-value2-value3');
    });

    it('should register and retrieve resources properly', () => {
        const resourceData = {type: 'test', value: 42, active: true};

        actionExecutor.registerResource('testResource', resourceData);
        const retrievedResource = actionExecutor.getResource('testResource');

        expect(retrievedResource).toEqual(resourceData);
    });

    it('should return undefined for non-existent resources', () => {
        const nonExistentResource = actionExecutor.getResource('nonExistent');

        expect(nonExistentResource).toBeUndefined();
    });
});