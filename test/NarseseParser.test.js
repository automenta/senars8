const { parse } = require('../src/reasoner/NarseseParser');

describe('NarseseParser', () => {

    test('should parse an atomic term', () => {
        const termKey = 'cat';
        const expected = { type: 'atomic', term: 'cat' };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should parse a simple implication statement', () => {
        const termKey = '(A ==> B)';
        const expected = { type: 'implication', subject: 'A', predicate: 'B' };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should parse an implication with compound subject', () => {
        const termKey = '((&, A, B) ==> C)';
        const expected = { type: 'implication', subject: '(&, A, B)', predicate: 'C' };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should parse a conjunction of two terms', () => {
        const termKey = '(&, cat, black)';
        const expected = { type: 'conjunction', terms: ['cat', 'black'] };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should parse a conjunction of multiple terms', () => {
        const termKey = '(&, A, B, C)';
        const expected = { type: 'conjunction', terms: ['A', 'B', 'C'] };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should parse a negation', () => {
        const termKey = '(--, cat)';
        const expected = { type: 'negation', term: 'cat' };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should parse an inheritance statement', () => {
        const termKey = '(cat --> mammal)';
        const expected = { type: 'inheritance', subject: 'cat', predicate: 'mammal' };
        expect(parse(termKey)).toEqual(expected);
    });

    test('should return null for non-string input', () => {
        expect(parse(null)).toBeNull();
        expect(parse(undefined)).toBeNull();
        expect(parse(123)).toBeNull();
        expect(parse({})).toBeNull();
    });

});
