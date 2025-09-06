const Term = require('../../src/core/Term');
const {buildTermKey} = require('../../src/utils/term-utils');

describe('Term', () => {
    test('should create a new Term object', () => {
        const term = new Term('cat');
        expect(term).toBeInstanceOf(Term);
        expect(term.key).toBe('cat');
        expect(term.embedding).toEqual([]);
        expect(term.complexity).toBe(1);
    });

    test('should create a new Term object with embedding and complexity', () => {
        const term = new Term('cat', [1, 2, 3], 3);
        expect(term).toBeInstanceOf(Term);
        expect(term.key).toBe('cat');
        expect(term.embedding).toEqual([1, 2, 3]);
        expect(term.complexity).toBe(3);
    });

    test('should throw an error if key is not a non-empty string', () => {
        expect(() => new Term('')).toThrow('Invalid arguments for Term constructor');
        expect(() => new Term(123)).toThrow('Invalid arguments for Term constructor');
    });

    test('should throw an error if embedding is not an array', () => {
        expect(() => new Term('cat', 'not-an-array')).toThrow('Invalid arguments for Term constructor');
    });

    test('should throw an error if complexity is not a positive number', () => {
        expect(() => new Term('cat', [], 0)).toThrow('Invalid arguments for Term constructor');
        expect(() => new Term('cat', [], -1)).toThrow('Invalid arguments for Term constructor');
    });
});

describe('buildTermKey', () => {
    test('should build a key for an atomic term', () => {
        const parsedTerm = {type: 'Atomic', key: 'cat'};
        expect(buildTermKey(parsedTerm)).toBe('cat');
    });

    test('should build a key for an inheritance term', () => {
        const parsedTerm = {
            type: 'Inheritance',
            subject: {type: 'Atomic', key: 'cat'},
            predicate: {type: 'Atomic', key: 'animal'}
        };
        expect(buildTermKey(parsedTerm)).toBe('(cat --> animal)');
    });

    test('should handle nested inheritance', () => {
        const parsedTerm = {
            type: 'Inheritance',
            subject: {
                type: 'Inheritance',
                subject: {type: 'Atomic', key: 'cat'},
                predicate: {type: 'Atomic', key: 'mammal'}
            },
            predicate: {type: 'Atomic', key: 'animal'}
        };
        expect(buildTermKey(parsedTerm)).toBe('((cat --> mammal) --> animal)');
    });

    test('should return an empty string for invalid input', () => {
        expect(buildTermKey(null)).toBe('');
        expect(buildTermKey({})).toBe('');
    });

    test('should throw an error for unsupported types', () => {
        const parsedTerm = {type: 'Unsupported', key: 'test'};
        expect(() => buildTermKey(parsedTerm)).toThrow('buildTermKey does not support type: Unsupported');
    });
});
