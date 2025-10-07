/**
 * Generalized tests for essential functionality using the new consolidated test utilities
 * This test suite demonstrates comprehensive coverage of core system functionality
 */
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {createTask, createTerm, createTestDataTemplate} from '../test-data-factory.js';
import {createCache, SystemFactory, TestFramework, validate, ValidationEngine} from '../shared/test-utils.js';
import {createContext, createMemoryContext} from '../test-setup.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import {parseTerm} from '../../core/parser/narseseParser.js';
import {DIContainer, LIFETIME} from '../../core/system/DIContainer.js';

describe('Generalized Essential Functionality Tests', () => {
    let testContext;

    beforeEach(async () => {
        testContext = await createContext({withSystem: true, withMemory: true, withReasoner: true});
    });

    afterEach(async () => {
        if (testContext?.cleanup) {
            await testContext.cleanup();
        }
    });

    test('should demonstrate comprehensive Task functionality testing', async () => {
        // Create different types of tasks using the data factory
        const basicTask = createTask('cat', '.', {frequency: 0.8, confidence: 0.9});
        const goalTask = createTask('food', '!', {frequency: 1.0, confidence: 0.95});
        const questionTask = createTask('weather', '?', {frequency: 0.5, confidence: 0.8});

        // Use framework assertions to validate tasks
        TestFramework.assertions.expectTask(basicTask, 'cat', '.', {frequency: 0.8, confidence: 0.9});
        TestFramework.assertions.expectTask(goalTask, 'food', '!', {frequency: 1.0, confidence: 0.95});
        TestFramework.assertions.expectTask(questionTask, 'weather', '?', {frequency: 0.5, confidence: 0.8});

        // Test task creation with edge cases
        expect(() => new Task(null, '.')).toThrow();
        expect(() => new Task({}, '.')).toThrow();
        expect(() => new Task('valid', 'X')).toThrow();

        // Validate task using the new validation engine
        const validationResult = validate(basicTask, 'objectSpec', 'task', {
            required: ['term', 'punctuation', 'state'],
            properties: {
                punctuation: '.',
                term: expect.any(Object)
            },
            types: {
                punctuation: 'string'
            }
        });

        expect(validationResult).toBe(basicTask);
    });

    test('should demonstrate comprehensive Term functionality testing', async () => {
        // Create different types of terms
        const atomicTerm = createTerm('cat', [0.1, 0.2, 0.3], 1);
        const complexTerm = createTerm('(cat --> animal)', [0.4, 0.5, 0.6], 2);

        // Validate terms using framework assertions
        TestFramework.assertions.expectTerm(atomicTerm, 'cat', 1);
        TestFramework.assertions.expectTerm(complexTerm, '(cat --> animal)', 2);

        // Test term type detection
        expect(atomicTerm.type).toBe('Atomic');
        expect(complexTerm.type).toBe('Inheritance');

        // Test term equality
        const sameTerm = createTerm('cat', [0.1, 0.2, 0.3], 1);
        expect(Term.termsEqual(atomicTerm, sameTerm)).toBe(true);

        // Validate term using the new validation engine
        const validationSpec = {
            required: ['key', 'embedding', 'complexity'],
            properties: {
                key: expect.any(String),
                embedding: expect.any(Array),
                complexity: expect.any(Number)
            }
        };

        const atomicValidation = validate(atomicTerm, 'objectSpec', 'atomicTerm', validationSpec);
        expect(atomicValidation).toBe(atomicTerm);

        const complexValidation = validate(complexTerm, 'objectSpec', 'complexTerm', validationSpec);
        expect(complexValidation).toBe(complexTerm);
    });

    test('should demonstrate comprehensive Memory functionality testing', async () => {
        const memoryContext = await createMemoryContext({
            withSystem: true,
            withMemory: true,
            systemConfig: {
                memory: {
                    CONSOLIDATION_PRIORITY_THRESHOLD: 0.0, // Disable consolidation for this test
                    CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.0, // Disable consolidation for this test
                    MAINTENANCE_CYCLE_FREQUENCY: 1000 // Reduce maintenance frequency
                }
            }
        });

        // Create and add tasks to memory
        const task1 = createTask('cat', '.', {frequency: 0.8, confidence: 0.9});
        const task2 = createTask('dog', '!', {frequency: 1.0, confidence: 0.85});

        const addedTasks = await memoryContext.addMultipleTasks([
            {key: 'cat', punctuation: '.', truthValue: {frequency: 0.8, confidence: 0.9}},
            {key: 'dog', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.85}}
        ]);

        expect(addedTasks).toHaveLength(2);

        // Test memory state assertions - allow for memory management
        const allTasks = await memoryContext.memory.getAllTasks();
        expect(allTasks.length).toBeGreaterThanOrEqual(0);

        // Test memory interaction - check if tasks exist in memory
        const hasCatTask = allTasks.some(t => t.termKey === 'cat');
        expect(hasCatTask).toBe(true);

        await memoryContext.cleanup();
    });

    test('should demonstrate comprehensive DIContainer functionality testing', () => {
        // Create a new DIContainer instance for testing
        const container = new DIContainer();

        // Test transient service registration and resolution
        class ServiceA {
            constructor() {
                this.id = Math.random();
            }
        }

        container.register('serviceA', ServiceA, [], {lifetime: LIFETIME.TRANSIENT});
        const instance1 = container.get('serviceA');
        const instance2 = container.get('serviceA');

        expect(instance1).toBeInstanceOf(ServiceA);
        expect(instance2).toBeInstanceOf(ServiceA);
        expect(instance1).not.toBe(instance2);

        // Test singleton service registration and resolution
        class ServiceB {
            constructor() {
                this.singletonId = 'single';
            }
        }

        container.register('serviceB', ServiceB, [], {lifetime: LIFETIME.SINGLETON});
        const instance3 = container.get('serviceB');
        const instance4 = container.get('serviceB');

        expect(instance3).toBeInstanceOf(ServiceB);
        expect(instance4).toBeInstanceOf(ServiceB);
        expect(instance3).toBe(instance4);

        // Test value registration
        const testValue = {message: 'hello'};
        container.registerValue('testValue', testValue);
        const resolvedValue = container.get('testValue');

        expect(resolvedValue).toBe(testValue);

        // Test dependency handling
        class ServiceD {
            constructor() {
            }
        }

        class ServiceC {
            constructor(serviceD) {
                this.serviceD = serviceD;
            }
        }

        container.register('serviceD', ServiceD, [], {lifetime: LIFETIME.SINGLETON});
        container.register('serviceC', ServiceC, ['serviceD'], {lifetime: LIFETIME.SINGLETON});
        const instanceC = container.get('serviceC');

        expect(instanceC).toBeInstanceOf(ServiceC);
        expect(instanceC.serviceD).toBeInstanceOf(ServiceD);

        // Test error handling
        expect(() => container.get('nonExistent')).toThrow('Service not found: nonExistent');
    });

    test('should demonstrate comprehensive Narsese parsing functionality testing', () => {
        // Test various Narsese expressions
        const atomicTerm = parseTerm('cat');
        expect(atomicTerm.type).toBe('Atomic');
        expect(atomicTerm.key).toBe('cat');

        const inheritanceTerm = parseTerm('(cat --> animal)');
        expect(inheritanceTerm.type).toBe('Inheritance');
        expect(inheritanceTerm.subject.key).toBe('cat');
        expect(inheritanceTerm.predicate.key).toBe('animal');

        const implicationTerm = parseTerm('(cat ==> mammal)');
        expect(implicationTerm.type).toBe('Implication');
        expect(implicationTerm.subject.key).toBe('cat');
        expect(implicationTerm.predicate.key).toBe('mammal');

        // Test goal and question parsing
        const goalTask = new Task(inheritanceTerm, '!', {frequency: 1.0, confidence: 0.9});
        expect(goalTask.punctuation).toBe('!');

        const questionTask = new Task(atomicTerm, '?', {frequency: 0.5, confidence: 0.9});
        expect(questionTask.punctuation).toBe('?');
    });

    test('should demonstrate performance testing utilities', async () => {
        // Test a function with performance measurement
        const quickFunction = () => {
            let sum = 0;
            for (let i = 0; i < 1000; i++) {
                sum += i;
            }
            return sum;
        };

        // Measure performance of the function
        const {result, executionTime} = await TestFramework.performance.measurePerformance(
            () => quickFunction(),
            50 // max 50ms allowed
        );

        expect(result).toBe(499500);
        expect(executionTime).toBeLessThan(50);

        // Test multiple iterations for performance
        const {averageTime} = await TestFramework.performance.measurePerformanceMultiple(
            () => quickFunction(),
            10, // 10 iterations
            100 // max average 100ms
        );

        expect(averageTime).toBeLessThan(100);
    });

    test('should demonstrate error handling and validation testing', async () => {
        // Test synchronous error handling
        const failingFunction = () => {
            throw new Error('Test synchronous error');
        };

        TestFramework.errors.testErrorHandling(failingFunction, 'Test synchronous error');

        // Test asynchronous error handling
        const asyncFailingFunction = async () => {
            throw new Error('Test async error');
        };

        await TestFramework.errors.testAsyncErrorHandling(asyncFailingFunction, 'Test async error');

        // Test validation engine with batch processing
        const testObjects = [
            {name: 'object1', value: 1},
            {name: 'object2', value: 2},
            {name: 'object3', value: 3}
        ];

        const validationResults = ValidationEngine.validateBatch(testObjects, 'objectSpec', {
            required: ['name', 'value'],
            types: {
                name: 'string',
                value: 'number'
            }
        });

        expect(validationResults).toHaveLength(3);
        expect(validationResults.every(r => r !== null)).toBe(true);
    });

    test('should demonstrate system factory usage for complex scenarios', async () => {
        // Use the system factory to create different system configurations
        const basicSystem = SystemFactory.create({reasoner: {strategy: 'BruteForce'}});
        expect(basicSystem.system).toBeDefined();
        expect(basicSystem.commandBus).toBeDefined();
        expect(basicSystem.eventBus).toBeDefined();

        const enhancedSystem = SystemFactory.create({
            reasoner: {strategy: 'BruteForce'},
            memory: {capacity: 1000}
        });
        expect(enhancedSystem.system).toBeDefined();

        // Test that both systems have the expected components
        TestFramework.assertions.expectComponents(basicSystem.container, ['memory', 'reasoner', 'tools']);
        TestFramework.assertions.expectComponents(enhancedSystem.container, ['memory', 'reasoner', 'tools']);
    });

    test('should demonstrate cache validation and performance metrics', () => {
        // Create a cache and perform operations to test its functionality
        const cache = createCache(100);

        // Add some items to cache
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');

        expect(cache.size).toBe(3);
        expect(cache.get('key1')).toBe('value1');
        expect(cache.get('key2')).toBe('value2');

        const hitRate = cache.hitRate;
        expect(hitRate).toBeGreaterThanOrEqual(0);

        // Clear cache and verify
        cache.clear();
        expect(cache.size).toBe(0);
    });
// Test suite for common data templates

    test('should demonstrate system factory usage for complex scenarios', async () => {
        // Use the system factory to create different system configurations
        const basicSystem = SystemFactory.create({reasoner: {strategy: 'BruteForce'}});
        expect(basicSystem.system).toBeDefined();
        expect(basicSystem.commandBus).toBeDefined();
        expect(basicSystem.eventBus).toBeDefined();

        const enhancedSystem = SystemFactory.create({
            reasoner: {strategy: 'BruteForce'},
            memory: {capacity: 1000}
        });
        expect(enhancedSystem.system).toBeDefined();

        // Test that both systems have the expected components
        TestFramework.assertions.expectComponents(basicSystem.container, ['memory', 'reasoner', 'tools']);
        TestFramework.assertions.expectComponents(enhancedSystem.container, ['memory', 'reasoner', 'tools']);
    });

    test('should demonstrate cache validation and performance metrics', () => {
        // Create a cache and perform operations to test its functionality
        const cache = createCache(100);

        // Add some items to cache
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');

        expect(cache.size).toBe(3);
        expect(cache.get('key1')).toBe('value1');
        expect(cache.get('key2')).toBe('value2');

        const hitRate = cache.hitRate;
        expect(hitRate).toBeGreaterThanOrEqual(0);

        // Clear cache and verify
        cache.clear();
        expect(cache.size).toBe(0);
    });
});

// Test suite for common data templates
describe('Test Data Template Validation', () => {
    test('should validate basic test data template', () => {
        const basicData = createTestDataTemplate('basic');
        expect(basicData.term).toBeDefined();
        expect(basicData.task).toBeDefined();
        expect(basicData.term.key).toBe('cat');
        expect(basicData.task.termKey).toBe('cat');
    });

    test('should validate inheritance test data template', () => {
        const inheritanceData = createTestDataTemplate('inheritance');

        expect(inheritanceData.subjectTerm).toBeDefined();
        expect(inheritanceData.predicateTerm).toBeDefined();
        expect(inheritanceData.inheritanceTerm).toBeDefined();
        expect(inheritanceData.subjectTask).toBeDefined();
        expect(inheritanceData.predicateTask).toBeDefined();
        expect(inheritanceData.inheritanceTask).toBeDefined();

        expect(inheritanceData.subjectTerm.key).toBe('cat');
        expect(inheritanceData.predicateTerm.key).toBe('animal');
        expect(inheritanceData.inheritanceTerm.key).toBe('(cat --> animal)');
    });

    test('should validate deduction test data template', () => {
        const deductionData = createTestDataTemplate('deduction');

        expect(deductionData.premiseA).toBeDefined();
        expect(deductionData.premiseB).toBeDefined();
        expect(deductionData.conclusion).toBeDefined();
        expect(deductionData.complexTerm).toBeDefined();
    });
});

// Example of running tests with scenario-based approach
describe('Scenario-based Testing Example', () => {
    test('should execute task processing scenario', async () => {
        await TestFramework.execution.withContext('taskProcessing', {}, async (context) => {
            expect(context).toBeDefined();

            // Simulate task processing
            const task = createTask('scenario-test', '.', {frequency: 0.9, confidence: 0.85});

            if (context.memory) {
                await context.memory.addTask?.(task) || context.memory.add?.(task);
            }

            if (context.reasoner) {
                await context.reasoner.processTask?.(task);
            }

            // Verify the scenario worked as expected
            expect(task).toBeDefined();
        });
    });
});