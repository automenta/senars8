/**
 * Example test demonstrating the usage of all new refactored utilities
 */

import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {createTaskDef, createTermDef} from './test-data-factory.js';
import {assertTask, createConfig, expectTruthValue} from './shared/test-utils.js';
import {BaseReasonerTest, ErrorTesting, PerformanceTesting, TaskProcessingScenario} from './test-base-classes.js';
import {EdgeCaseTester} from './coverage-quality-checks.js';
import * as logger from '../core/utils/logger.js';
import {TestDocumentationGenerator} from './documentation-structure.js';

// Example usage of the new test utilities

describe('Refactored Test Utilities - Example Usage', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {
        });
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('should demonstrate test data factory usage', () => {
        // Using the test data factory
        const taskDef = createTaskDef('(cat --> animal)', '.', [0.8, 0.9]);
        const termDef = createTermDef('cat', [0.1, 0.2, 0.3], 1);

        expect(taskDef.sentence).toBe('(cat --> animal)');
        expect(taskDef.punctuation).toBe('.');
        expect(taskDef.truth).toEqual([0.8, 0.9]);
        expect(termDef.key).toBe('cat');
        expect(termDef.complexity).toBe(1);
    });

    test('should demonstrate assertion helpers usage', () => {
        // Example object that would come from actual system
        const mockTask = {
            termKey: 'cat',
            punctuation: '.',
            state: {
                truthValue: {
                    frequency: 0.8,
                    confidence: 0.9
                }
            }
        };

        assertTask(mockTask, 'cat', '.', {frequency: 0.8, confidence: 0.9});
        expectTruthValue(mockTask.state.truthValue, 0.8, 0.9);
    });

    test('should demonstrate configuration-driven testing', () => {
        // Create test config using template with override
        const config = createConfig('UNIT_TEST', {timeout: 10000});

        // The config should have the overridden timeout value
        expect(config.timeout).toBe(10000);
        expect(config.setup).toBe('unit');
        expect(config.mockLevel).toBe('full');
    });

    test('should demonstrate reusable test scenarios', async () => {
        // Use the function instead of constructor
        const scenario = TaskProcessingScenario({
            sampleTasks: [
                {key: 'test1', punctuation: '.'},
                {key: 'test2', punctuation: '!'}
            ]
        });

        let context = {};
        context = await scenario.setup(context);

        expect(context.tasks).toBeDefined();
        // Note: The actual implementation of setup might not create tasks in context
        // This test is just demonstrating the usage pattern

        await scenario.teardown(context);
    });

    test('should demonstrate edge case testing', async () => {
        // Example function to test
        const processValue = (val) => {
            if (val === null || val === undefined || Number.isNaN(val)) {
                throw new Error('Value must be a valid number');
            }
            if (val < 0) {
                // Just return 0 for negative values instead of throwing
                return 0;
            }
            return val * 2;
        };

        const tester = new EdgeCaseTester();
        tester
            .addBoundaryTests(processValue, [0, 1, 10], (result, input) => {
                input < 0
                    ? expect(result).toBe(0)
                    : expect(result).toBe(input * 2);
            })
            .addNullUndefinedTests(processValue, (result, input) => {
                // Verify error handling for null/undefined
                (input === null || input === undefined) && expect(result.error).toBeDefined();
            });

        await tester.runAll();
    });

    test('should demonstrate mock creation', () => {
        // Create a mock reasoner manually since we don't have mock builders
        const mockReasoner = {
            name: 'TestReasoner',
            processTask: async () => ({result: 'processed'}),
            getInferences: () => ['inference1', 'inference2']
        };

        // Validate the mock
        expect(mockReasoner.name).toBe('TestReasoner');
        expect(typeof mockReasoner.processTask).toBe('function');
        expect(typeof mockReasoner.getInferences).toBe('function');
        expect(mockReasoner.getInferences()).toEqual(['inference1', 'inference2']);
    });

    test('should demonstrate documentation generator usage', () => {
        // Create documentation for a test suite
        const suiteDoc = TestDocumentationGenerator.createSuiteDoc(
            'Task Processing',
            'Tests for task processing functionality',
            'unit'
        )
            .addSetupRequirement('System with initialized reasoner')
            .addTestCase(
                'Process valid task',
                'Verifies that valid tasks are processed correctly',
                'Given a valid task, when processTask is called, then the task is processed',
                'Processed successfully'
            );

        // Generate markdown documentation
        const markdown = suiteDoc.generateMarkdown();
        expect(markdown).toContain('# Test Suite: Task Processing');
        expect(markdown).toContain('**Category:** unit');
    });
});

// Example of using the base test class
class ExampleReasonerTest extends BaseReasonerTest {
    async testTaskProcessing() {
        await this.setup({reasoner: {strategy: 'BruteForce'}});

        // Example test using base class utilities
        const result = await this.processTask('test-term', '.', {frequency: 0.8, confidence: 0.9});

        // Teardown is handled automatically
        await this.teardown();

        return result;
    }
}

// Example of using the new utility objects
describe('New Utility Objects Example', () => {
    test('should demonstrate error testing utilities', () => {
        const failingFunction = () => {
            throw new Error('Test error');
        };

        // Using the new utility object instead of mixin
        expect(() => ErrorTesting.testErrorHandling(failingFunction, 'Test error')).not.toThrow();
    });

    test('should demonstrate performance testing utilities', async () => {
        const quickOperation = () => 'result';

        // Using the new utility object instead of mixin
        const {result, executionTime} = await PerformanceTesting.measurePerformance(
            () => quickOperation(),
            100 // max 100ms
        );

        expect(result).toBe('result');
        expect(executionTime).toBeLessThan(100);
    });
});

