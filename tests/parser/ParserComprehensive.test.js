/**
 * Comprehensive parser tests using consolidated test utilities
 * Tests Narsese parser functionality with various input types
 */
import {describe, test, expect, beforeEach, afterEach} from 'vitest';
import {parseTerm} from '../../core/parser/narseseParser.js';
import {createTask, createTestDataTemplate} from '../test-data-factory.js';
import {TestFramework, validate} from '../shared/test-utils.js';
import {createContext} from '../test-setup.js';

describe('Parser - Narsese Expression Tests', () => {
    let testContext;

    beforeEach(async () => {
        testContext = await createContext({withSystem: false});
    });

    afterEach(async () => {
        if (testContext?.cleanup) {
            await testContext.cleanup();
        }
    });

    test('should parse atomic terms correctly', () => {
        const atomicTerm = parseTerm('cat');
        expect(atomicTerm.type).toBe('Atomic');
        expect(atomicTerm.key).toBe('cat');

        const complexAtomic = parseTerm('very_long_name_with_numbers_123');
        expect(complexAtomic.type).toBe('Atomic');
        expect(complexAtomic.key).toBe('very_long_name_with_numbers_123');

        // Test validation of parsed term
        const validationSpec = {
            required: ['type', 'key'],
            properties: {
                type: 'Atomic',
                key: expect.any(String)
            }
        };

        validate(atomicTerm, 'objectSpec', 'parsedAtomicTerm', validationSpec);
    });

    test('should parse inheritance relations correctly', () => {
        const inheritanceTerm = parseTerm('(cat --> animal)');
        expect(inheritanceTerm.type).toBe('Inheritance');
        expect(inheritanceTerm.subject.key).toBe('cat');
        expect(inheritanceTerm.predicate.key).toBe('animal');
        expect(inheritanceTerm.key).toBe('(cat --> animal)');

        // Complex inheritance
        const complexInheritance = parseTerm('((cat --> animal) --> entity)');
        expect(complexInheritance.type).toBe('Inheritance');
        expect(complexInheritance.subject.type).toBe('Inheritance');
        expect(complexInheritance.predicate.key).toBe('entity');
    });

    test('should parse implication relations correctly', () => {
        const implicationTerm = parseTerm('(cat ==> mammal)');
        expect(implicationTerm.type).toBe('Implication');
        expect(implicationTerm.subject.key).toBe('cat');
        expect(implicationTerm.predicate.key).toBe('mammal');
        expect(implicationTerm.key).toBe('(cat ==> mammal)');

        // Complex implication
        const complexImplication = parseTerm('((dog --> animal) ==> (dog --> mammal))');
        expect(complexImplication.type).toBe('Implication');
        expect(complexImplication.subject.type).toBe('Inheritance');
        expect(complexImplication.predicate.type).toBe('Inheritance');
    });

    test('should parse similarity relations correctly', () => {
        const similarityTerm = parseTerm('(cat <-> animal)');
        expect(similarityTerm.type).toBe('Similarity');
        expect(similarityTerm.subject.key).toBe('cat');
        expect(similarityTerm.predicate.key).toBe('animal');
        expect(similarityTerm.key).toBe('(cat <-> animal)');
    });

    test('should parse conjunction and disjunction operations', () => {
        const conjunctionTerm = parseTerm('(cat & dog)');
        expect(conjunctionTerm.type).toBe('Conjunction');
        expect(conjunctionTerm.terms).toHaveLength(2);
        expect(conjunctionTerm.terms[0].key).toBe('cat');
        expect(conjunctionTerm.terms[1].key).toBe('dog');

        const disjunctionTerm = parseTerm('(rain | snow)');
        expect(disjunctionTerm.type).toBe('Disjunction');
        expect(disjunctionTerm.terms).toHaveLength(2);
        expect(disjunctionTerm.terms[0].key).toBe('rain');
        expect(disjunctionTerm.terms[1].key).toBe('snow');
    });

    test('should parse temporal operations', () => {
        const sequenceTerm = parseTerm('&/ first second');
        expect(sequenceTerm.type).toBe('Sequence');
        expect(sequenceTerm.terms).toHaveLength(2);
        expect(sequenceTerm.terms[0].key).toBe('first');
        expect(sequenceTerm.terms[1].key).toBe('second');

        const parallelTerm = parseTerm('&| simultaneous events');
        expect(parallelTerm.type).toBe('Parallel');
        expect(parallelTerm.terms).toHaveLength(2);
        expect(parallelTerm.terms[0].key).toBe('simultaneous');
        expect(parallelTerm.terms[1].key).toBe('events');
    });

    test('should parse operation terms with arguments', () => {
        const operationTerm = parseTerm('move(north)');
        expect(operationTerm.type).toBe('Operation');
        expect(operationTerm.subject.key).toBe('move');
        expect(operationTerm.predicate.terms).toHaveLength(1);
        expect(operationTerm.predicate.terms[0].key).toBe('north');

        const complexOperation = parseTerm('pickup(book, table)');
        expect(complexOperation.type).toBe('Operation');
        expect(complexOperation.subject.key).toBe('pickup');
        expect(complexOperation.predicate.terms).toHaveLength(2);
        expect(complexOperation.predicate.terms[0].key).toBe('book');
        expect(complexOperation.predicate.terms[1].key).toBe('table');
    });

    test('should handle error cases gracefully', () => {
        // Invalid syntax should throw
        expect(() => parseTerm('invalid (syntax')).toThrow();
        expect(() => parseTerm('')).toThrow();
        expect(() => parseTerm('((')).toThrow();
        expect(() => parseTerm(')')).toThrow();
    });

    test('should work with Task creation and validation', () => {
        const parsedTerm = parseTerm('(dog --> mammal)');
        const task = createTask(parsedTerm, '.', {frequency: 0.8, confidence: 0.9});
        
        TestFramework.assertions.expectTask(task, '(dog --> mammal)', '.', {frequency: 0.8, confidence: 0.9});
    });

    test('should parse nested expressions correctly', () => {
        const nestedTerm = parseTerm('(((cat --> animal) & (animal --> living)) ==> (cat --> living))');
        expect(nestedTerm.type).toBe('Implication');
        expect(nestedTerm.subject.type).toBe('Conjunction');
        expect(nestedTerm.subject.terms).toHaveLength(2);
        expect(nestedTerm.subject.terms[0].type).toBe('Inheritance');
        expect(nestedTerm.subject.terms[1].type).toBe('Inheritance');
        expect(nestedTerm.predicate.type).toBe('Inheritance');
    });

    test('should parse equivalence relations', () => {
        const equivalenceTerm = parseTerm('(fish <=> aquatic)');
        expect(equivalenceTerm.type).toBe('Equivalence');
        expect(equivalenceTerm.subject.key).toBe('fish');
        expect(equivalenceTerm.predicate.key).toBe('aquatic');
    });

    test('should handle various punctuation in terms', () => {
        // Test with numbers and special characters
        const numericTerm = parseTerm('item123');
        expect(numericTerm.type).toBe('Atomic');
        expect(numericTerm.key).toBe('item123');

        const hyphenatedTerm = parseTerm('in-out');
        expect(hyphenatedTerm.type).toBe('Atomic');
        expect(hyphenatedTerm.key).toBe('in-out');
    });

    test('should validate parsed expressions with performance', async () => {
        const expressions = [
            'simple',
            '(A --> B)',
            '(X ==> Y)',
            '(P <-> Q)',
            '(a & b & c)',
            '&/ before after',
            'operation(param)'
        ];

        // Performance test for parsing multiple expressions
        const {result: parsedResults, executionTime} = await TestFramework.performance.measurePerformance(() => {
            return expressions.map(expr => parseTerm(expr));
        }, 100); // Allow up to 100ms for all parsing

        expect(parsedResults).toHaveLength(expressions.length);
        expect(executionTime).toBeLessThan(100);

        // Validate each result
        parsedResults.forEach((result, index) => {
            expect(result).toBeDefined();
            expect(result.type).toBeDefined();
            expect(result.key).toBeDefined();
        });
    });
});

describe('Parser - Edge Cases and Robustness Tests', () => {
    test('should handle deeply nested expressions', () => {
        const deepNest = parseTerm('(((a --> b) --> c) --> d)');
        expect(deepNest.type).toBe('Inheritance');
        expect(deepNest.subject.type).toBe('Inheritance');
        expect(deepNest.subject.subject.type).toBe('Inheritance');
        expect(deepNest.predicate.key).toBe('d');
    });

    test('should handle complex conjunctions and disjunctions', () => {
        const complexConjunction = parseTerm('(a & b & c & d & e)');
        expect(complexConjunction.type).toBe('Conjunction');
        expect(complexConjunction.terms).toHaveLength(5);

        const complexMixed = parseTerm('((a & b) | (c & d))');
        expect(complexMixed.type).toBe('Disjunction');
        expect(complexMixed.terms[0].type).toBe('Conjunction');
        expect(complexMixed.terms[1].type).toBe('Conjunction');
    });

    test('should maintain proper precedence in complex expressions', () => {
        // Test precedence of different operators
        const precedenceTest = parseTerm('(a & b ==> c & d)');
        expect(precedenceTest.type).toBe('Implication');
        expect(precedenceTest.subject.type).toBe('Conjunction');
        expect(precedenceTest.predicate.type).toBe('Conjunction');
    });

    test('should provide meaningful error messages', () => {
        try {
            parseTerm('(unclosed bracket');
            expect(false).toBe(true); // Should not reach this
        } catch (error) {
            expect(error.message).toContain('Expected');
        }

        try {
            parseTerm('');
            expect(false).toBe(true); // Should not reach this
        } catch (error) {
            expect(error.message).toContain('empty');
        }
    });

    test('should handle whitespace and formatting variations', () => {
        const compact = parseTerm('(a-->b)');
        const spaced = parseTerm('(a --> b)');
        const tabbed = parseTerm('(a\t-->\tb)');
        const newline = parseTerm('(a\n-->\nb)');

        // They should all parse to the same logical structure
        expect(compact.type).toBe('Inheritance');
        expect(spaced.type).toBe('Inheritance');
        expect(tabbed.type).toBe('Inheritance');
        expect(newline.type).toBe('Inheritance');

        expect(compact.subject.key).toBe('a');
        expect(compact.predicate.key).toBe('b');
    });
});

// Data-driven tests for parser functionality
describe('Parser - Data Driven Tests', () => {
    const testCases = [
        {input: 'test', expectedType: 'Atomic', expectedKey: 'test', description: 'Simple atomic term'},
        {input: '(A --> B)', expectedType: 'Inheritance', expectedKey: '(A --> B)', description: 'Simple inheritance'},
        {input: '(X ==> Y)', expectedType: 'Implication', expectedKey: '(X ==> Y)', description: 'Simple implication'},
        {input: 'operation(param)', expectedType: 'Operation', description: 'Simple operation with parameter'},
        {input: '(P <-> Q)', expectedType: 'Similarity', description: 'Similarity relation'},
        {input: '(a & b)', expectedType: 'Conjunction', description: 'Conjunction'},
        {input: '&/ first next', expectedType: 'Sequence', description: 'Temporal sequence'}
    ];

    testCases.forEach((testCase, index) => {
        test(`Data-driven parser test case ${index + 1}: ${testCase.description}`, () => {
            const result = parseTerm(testCase.input);
            expect(result.type).toBe(testCase.expectedType);
            if (testCase.expectedKey) {
                expect(result.key).toBe(testCase.expectedKey);
            }
        });
    });
});