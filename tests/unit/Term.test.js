import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import Term from '../../core/core/Term.js';
import {findSimilarTerms, structuralSimilarity} from '../../core/core/TermUtils.js';
import EmbeddingStore from '../../core/utils/embeddingStore.js';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';
import * as logger from '../../core/utils/logger.js';

describe('Term', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        EmbeddingStore.clear();
    });

    afterEach(() => {
        warnSpy.mockRestore();
        EmbeddingStore.clear();
    });

    test('should create a new Term object', () => {
        const term = new Term('cat', SYSTEM_CONSTANTS.DEFAULT_EMBEDDING, SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY);
        expect(term).toBeInstanceOf(Term);
        expect(term.key).toBe('cat');
        expect(term.embedding).toEqual(SYSTEM_CONSTANTS.DEFAULT_EMBEDDING);
        expect(term.complexity).toBe(SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY);
    });

    test.each([
        ['cat', 'Atomic'],
        ['(a --> b)', 'Inheritance'],
        ['(a <-> b)', 'Similarity'],
    ])('should get the type of term "%s" as "%s"', (key, type) => {
        const term = new Term(key);
        expect(term.type).toBe(type);
    });

    test('should get the components of a complex term', () => {
        const complexTerm = new Term('(a --> b)');
        expect(complexTerm.subject).toBeInstanceOf(Term);
        expect(complexTerm.subject.key).toBe('a');
        expect(complexTerm.predicate).toBeInstanceOf(Term);
        expect(complexTerm.predicate.key).toBe('b');
    });

    test('should check for equality between two terms', () => {
        const term1 = new Term('cat', [0.1, 0.2, 0.3]);
        const term2 = new Term('cat', [0.1, 0.2, 0.3]);
        const term3 = new Term('dog', [0.4, 0.5, 0.6]);
        const term4 = new Term('cat', [0.1, 0.2, 0.4]);
        expect(Term.termsEqual(term1, term2)).toBe(true);
        expect(Term.termsEqual(term1, term3)).toBe(false);
        expect(Term.termsEqual(term1, term4)).toBe(false);
        expect(Term.termsEqual(null, term1)).toBe(false);
        expect(Term.termsEqual(term1, null)).toBe(false);
        expect(Term.termsEqual(null, null)).toBe(true);
    });

    test('should create a Term from a JSON object', () => {
        const json = {
            key: 'cat',
            embedding: SYSTEM_CONSTANTS.DEFAULT_EMBEDDING,
            complexity: SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY
        };
        const term = Term.fromJSON(json);
        expect(term).toBeInstanceOf(Term);
        expect(term.key).toBe('cat');
    });

    test('should build a term key from a parsed term structure', () => {
        const pTerm = {type: 'Inheritance', subject: {type: 'Atomic', key: 'a'}, predicate: {type: 'Atomic', key: 'b'}};
        expect(Term.termKey(pTerm)).toBe('(a --> b)');
    });

    test.each([
        [null, ''],
        [undefined, ''],
        [{}, ''],
    ])('should handle invalid inputs to buildTermKey: %p', (input, expected) => {
        expect(Term.termKey(input)).toBe(expected);
    });

    test('should throw for unsupported term types in buildTermKey', () => {
        expect(() => Term.termKey({type: 'UnsupportedType', key: 'test'})).toThrow('buildTermKey does not support type: UnsupportedType');
    });

    test.each([
        ['(a --> b)', '(a --> c)', 0.8],
        ['', '', 1.0],
        ['', 'test', 0],
        ['a', 'b', 0],
        ['abc', 'abd', 0.5],
        ['(cat --> dog)', '(cat --> dog)', 1.0],
    ])('should calculate structural similarity between "%s" and "%s"', (key1, key2, expected) => {
        expect(structuralSimilarity(key1, key2)).toBeCloseTo(expected);
    });

    test('should find similar terms', () => {
        const terms = new Map([
            ['a', new Term('a', [1, 0, 0])],
            ['b', new Term('b', [0, 1, 0])],
            ['c', new Term('c', [0.9, 0.1, 0])],
        ]);
        const similarTerms = findSimilarTerms(terms, 'a');
        expect(similarTerms[0].termKey).toBe('c');
    });

    describe('Embedding Handling', () => {
        test.each([
            [[]],
            [null],
            [undefined],
        ])('should handle invalid initial embedding: %p', (embedding) => {
            const term = new Term('cat', embedding);
            expect(term.embedding).toEqual([]);
        });

        test('should set and release embeddings correctly', () => {
            const term = new Term('test');
            expect(EmbeddingStore.size()).toBe(0);
            term.setEmbedding(SYSTEM_CONSTANTS.DEFAULT_EMBEDDING);
            expect(EmbeddingStore.size()).toBe(1);
            term.destroy();
            expect(EmbeddingStore.size()).toBe(0);
        });

        test('should update embedding', () => {
            const term = new Term('cat');
            const embedding1 = [0.1, 0.2, 0.3];
            term.setEmbedding(embedding1);
            expect(term.embedding).toEqual(embedding1);
            const embedding2 = [0.4, 0.5, 0.6];
            term.setEmbedding(embedding2);
            expect(term.embedding).toEqual(embedding2);
        });
    });

    test('should handle special characters in term keys', () => {
        const specialKey = '(cat --> "special_\'chars\'_here")';
        const term = new Term(specialKey);
        expect(term.key).toBe(specialKey);
    });

    test('should handle complex nested term structures', () => {
        const nestedTerm = {
            type: 'Inheritance',
            subject: {type: 'Inheritance', subject: {type: 'Inheritance', subject: {type: 'Atomic', key: 'a'}, predicate: {type: 'Atomic', key: 'b'}}, predicate: {type: 'Atomic', key: 'c'}},
            predicate: {type: 'Atomic', key: 'd'},
        };
        const key = Term.termKey(nestedTerm);
        expect(key).toBe('(((a --> b) --> c) --> d)');
    });

    test('should handle term destruction correctly', () => {
        const term = new Term('cat');
        term.setEmbedding([0.1, 0.2, 0.3]);
        expect(term.embedding).toEqual([0.1, 0.2, 0.3]);
        term.destroy();
        expect(term.embedding).toEqual([]);
    });

    test('should handle toJSON correctly', () => {
        const term = new Term('cat', [0.1, 0.2, 0.3], 2);
        const json = term.toJSON();
        expect(json.key).toBe('cat');
        expect(json.embedding).toEqual([0.1, 0.2, 0.3]);
        expect(json.complexity).toBe(2);
    });
});
