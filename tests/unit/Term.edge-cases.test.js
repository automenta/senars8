import Term from '../../src/core/Term.js';

describe('Term - Edge Cases', () => {
    test('should handle empty embedding arrays', () => {
        const term = new Term('cat', []);
        expect(term.embedding).toEqual([]);
        expect(term.complexity).toBe(1);
    });

    test('should handle null embedding values', () => {
        const term = new Term('cat', null);
        expect(term.embedding).toEqual([]);
    });

    test('should handle undefined embedding values', () => {
        const term = new Term('cat', undefined);
        expect(term.embedding).toEqual([]);
    });

    test('should handle very long term keys', () => {
        const longKey = 'a'.repeat(10000);
        const term = new Term(longKey);
        expect(term.key).toBe(longKey);
        expect(term.complexity).toBe(1);
    });

    test('should handle special characters in term keys', () => {
        const specialKey = '(cat --> "special_\'chars\'_here")';
        const term = new Term(specialKey);
        expect(term.key).toBe(specialKey);
    });

    test('should handle unsupported term types in buildTermKey', () => {
        expect(() => Term.buildTermKey({type: 'UnsupportedType', key: 'test'}))
            .toThrow('buildTermKey does not support type: UnsupportedType');
    });

    test('should handle null and undefined inputs to buildTermKey', () => {
        expect(Term.buildTermKey(null)).toBe('');
        expect(Term.buildTermKey(undefined)).toBe('');
        expect(Term.buildTermKey({})).toBe('');
    });

    test('should handle complex nested term structures', () => {
        // Create a deeply nested term structure
        const nestedTerm = {
            type: 'Inheritance',
            subject: {
                type: 'Inheritance',
                subject: {
                    type: 'Inheritance',
                    subject: {type: 'Atomic', key: 'a'},
                    predicate: {type: 'Atomic', key: 'b'}
                },
                predicate: {type: 'Atomic', key: 'c'}
            },
            predicate: {type: 'Atomic', key: 'd'}
        };

        const key = Term.buildTermKey(nestedTerm);
        expect(key).toBe('(((a --> b) --> c) --> d)');
    });

    test('should handle terms with duplicate components', () => {
        const term = new Term('(cat --> cat)');
        expect(term.type).toBe('Inheritance');
        expect(term.subject.key).toBe('cat');
        expect(term.predicate.key).toBe('cat');
    });

    test('should handle structural similarity with empty strings', () => {
        const similarity = Term.structuralSimilarity('', '');
        expect(similarity).toBe(1.0); // Identical strings

        const similarity2 = Term.structuralSimilarity('', 'test');
        expect(similarity2).toBe(0); // One empty string
    });

    test('should handle structural similarity with very short strings', () => {
        const similarity = Term.structuralSimilarity('a', 'b');
        expect(similarity).toBe(0); // No common bigrams

        const similarity2 = Term.structuralSimilarity('ab', 'ac');
        expect(similarity2).toBe(0); // No common bigrams ('ab' vs 'ac')

        // Test with actual common bigrams
        const similarity3 = Term.structuralSimilarity('abc', 'abd');
        expect(similarity3).toBeCloseTo(0.5); // One common bigram ('ab') out of two total
    });

    test('should handle structural similarity with identical strings', () => {
        const similarity = Term.structuralSimilarity('(cat --> dog)', '(cat --> dog)');
        expect(similarity).toBe(1.0);
    });

    test('should handle embedding setting and resource cleanup', () => {
        const term = new Term('cat');
        expect(term.embedding).toEqual([]);

        // Set embedding
        const embedding1 = [0.1, 0.2, 0.3];
        term.setEmbedding(embedding1);
        expect(term.embedding).toEqual(embedding1);

        // Update embedding
        const embedding2 = [0.4, 0.5, 0.6];
        term.setEmbedding(embedding2);
        expect(term.embedding).toEqual(embedding2);
    });

    test('should handle term equality correctly', () => {
        const term1 = new Term('cat');
        const term2 = new Term('cat');
        const term3 = new Term('dog');

        // Same key should be equal
        expect(Term.termsEqual(term1, term2)).toBe(true);

        // Different keys should not be equal
        expect(Term.termsEqual(term1, term3)).toBe(false);

        // Null checks
        expect(Term.termsEqual(null, term1)).toBe(false);
        expect(Term.termsEqual(term1, null)).toBe(false);
        expect(Term.termsEqual(null, null)).toBe(true);

        // With embeddings
        term1.setEmbedding([0.1, 0.2, 0.3]);
        term2.setEmbedding([0.1, 0.2, 0.3]);
        expect(Term.termsEqual(term1, term2)).toBe(true);

        // Different embeddings - but terms with same key share embeddings by design
        // So we need to test with different term keys
        const term4 = new Term('dog');
        const term5 = new Term('bird');
        term4.setEmbedding([0.1, 0.2, 0.3]);
        term5.setEmbedding([0.1, 0.2, 0.4]);
        expect(Term.termsEqual(term4, term5)).toBe(false);
    });

    test('should handle term destruction correctly', () => {
        const term = new Term('cat');
        term.setEmbedding([0.1, 0.2, 0.3]);

        // Before destruction
        expect(term.embedding).toEqual([0.1, 0.2, 0.3]);

        // After destruction
        term.destroy();
        expect(term.embedding).toEqual([]); // Should be cleared
    });

    test('should handle toJSON correctly', () => {
        const term = new Term('cat', [0.1, 0.2, 0.3], 2);
        const json = term.toJSON();

        expect(json.key).toBe('cat');
        expect(json.embedding).toEqual([0.1, 0.2, 0.3]);
        expect(json.complexity).toBe(2);
    });
});