import Term from '../../core/core/Term.js';
import {findSimilarTerms, structuralSimilarity} from '../../core/core/TermUtils.js';
import EmbeddingStore from '../../core/utils/embeddingStore.js';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';

describe('Term', () => {
    afterEach(() => {
        EmbeddingStore.clear();
    });

    test('should create a new Term object', () => {
        const term = new Term('cat', SYSTEM_CONSTANTS.DEFAULT_EMBEDDING, SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY);
        expect(term).toBeInstanceOf(Term);
        expect(term.key).toBe('cat');
        expect(term.embedding).toEqual(SYSTEM_CONSTANTS.DEFAULT_EMBEDDING);
        expect(term.complexity).toBe(SYSTEM_CONSTANTS.DEFAULT_COMPLEXITY);
    });

    test('should get the type of the term', () => {
        const atomicTerm = new Term('cat');
        expect(atomicTerm.type).toBe('Atomic');
        const complexTerm = new Term('(a --> b)');
        expect(complexTerm.type).toBe('Inheritance');
    });

    test('should get the components of a complex term', () => {
        const complexTerm = new Term('(a --> b)');
        expect(complexTerm.subject).toBeInstanceOf(Term);
        expect(complexTerm.subject.key).toBe('a');
        expect(complexTerm.predicate).toBeInstanceOf(Term);
        expect(complexTerm.predicate.key).toBe('b');
    });

    test('should check for equality between two terms', () => {
        const term1 = new Term('cat', SYSTEM_CONSTANTS.DEFAULT_EMBEDDING);
        const term2 = new Term('cat', SYSTEM_CONSTANTS.DEFAULT_EMBEDDING);
        const term3 = new Term('dog', [0.4, 0.5, 0.6]);
        expect(Term.termsEqual(term1, term2)).toBe(true);
        expect(Term.termsEqual(term1, term3)).toBe(false);
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
        const pTerm = {
            type: 'Inheritance',
            subject: {
                type: 'Atomic',
                key: 'a'
            },
            predicate: {
                type: 'Atomic',
                key: 'b'
            },
        };
        expect(Term.termKey(pTerm)).toBe('(a --> b)');
    });

    test('should calculate structural similarity between two term keys', () => {
        const termKey1 = '(a --> b)';
        const termKey2 = '(a --> c)';
        expect(structuralSimilarity(termKey1, termKey2)).toBeCloseTo(0.8);
    });

    test('should find similar terms', () => {
        const terms = new Map();
        terms.set('a', new Term('a', [1, 0, 0]));
        terms.set('b', new Term('b', [0, 1, 0]));
        terms.set('c', new Term('c', [0.9, 0.1, 0]));
        const similarTerms = findSimilarTerms(terms, 'a');
        expect(similarTerms[0].termKey).toBe('c');
    });

    test('should set and release embeddings correctly', () => {
        const term = new Term('test');
        expect(EmbeddingStore.size()).toBe(0);
        term.setEmbedding(SYSTEM_CONSTANTS.DEFAULT_EMBEDDING);
        expect(EmbeddingStore.size()).toBe(1);
        term.destroy();
        expect(EmbeddingStore.size()).toBe(0);
    });
});
