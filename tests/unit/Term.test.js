const Term = require('../../src/core/Term');

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
        expect(() => new Term('')).toThrow('Invalid key for Term constructor');
        expect(() => new Term(123)).toThrow('Invalid key for Term constructor');
    });

    test('should parse and cache the term structure', () => {
        const term = new Term('(cat --> animal)');
        expect(term.type).toBe('Inheritance');
        expect(term.subject.key).toBe('cat');
        expect(term.predicate.key).toBe('animal');
    });
});

describe('Term.buildTermKey', () => {
    test('should build a key for an atomic term', () => {
        const parsedTerm = {type: 'Atomic', key: 'cat'};
        expect(Term.buildTermKey(parsedTerm)).toBe('cat');
    });

    test('should build a key for an inheritance term', () => {
        const parsedTerm = {
            type: 'Inheritance',
            subject: {type: 'Atomic', key: 'cat'},
            predicate: {type: 'Atomic', key: 'animal'}
        };
        expect(Term.buildTermKey(parsedTerm)).toBe('(cat --> animal)');
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
        expect(Term.buildTermKey(parsedTerm)).toBe('((cat --> mammal) --> animal)');
    });

    test('should return an empty string for invalid input', () => {
        expect(Term.buildTermKey(null)).toBe('');
        expect(Term.buildTermKey({})).toBe('');
    });

    test('should throw an error for unsupported types', () => {
        const parsedTerm = {type: 'Unsupported', key: 'test'};
        expect(() => Term.buildTermKey(parsedTerm)).toThrow('buildTermKey does not support type: Unsupported');
    });
});
