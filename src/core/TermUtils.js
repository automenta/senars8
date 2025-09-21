import {tokenize} from '../parser/lexer.js';
import {cosineSimilarity} from '../utils/math.js';
import config from '../config/index.js';
import {createUnifiedErrorHandler} from '../utils/errorHandler.js';

const errorHandler = createUnifiedErrorHandler('TermUtils');

export const structuralSimilarity = (termKey1, termKey2) => {
    return errorHandler.executeSync(() => {
        // Early return for identical strings
        if (termKey1 === termKey2) {
            return 1.0;
        }

        const tokens1 = tokenize(termKey1);
        const tokens2 = tokenize(termKey2);

        // Optimize for single token case
        if (tokens1.length === 1 && tokens2.length === 1) {
            const len1 = termKey1.length;
            const len2 = termKey2.length;
            if (len1 < 2 || len2 < 2) return 0;

            const bigrams1 = new Set();
            for (let i = 0; i < len1 - 1; i++) {
                bigrams1.add(termKey1.substring(i, i + 2));
            }

            let intersection = 0;
            for (let i = 0; i < len2 - 1; i++) {
                if (bigrams1.has(termKey2.substring(i, i + 2))) {
                    intersection++;
                }
            }

            return (2 * intersection) / (len1 + len2 - 2);
        }

        // Handle empty cases
        if (tokens1.length === 0 && tokens2.length === 0) {
            return 1.0;
        }
        if (tokens1.length === 0 || tokens2.length === 0) {
            return 0.0;
        }

        // Use Maps for O(1) lookup instead of arrays
        const map1 = new Map();
        for (const token of tokens1) {
            map1.set(token, (map1.get(token) || 0) + 1);
        }

        const map2 = new Map();
        for (const token of tokens2) {
            map2.set(token, (map2.get(token) || 0) + 1);
        }

        // Calculate intersection more efficiently
        let intersection = 0;
        for (const [token, count1] of map1) {
            const count2 = map2.get(token);
            if (count2) {
                intersection += Math.min(count1, count2);
            }
        }

        return (2 * intersection) / (tokens1.length + tokens2.length);
    }, 'structuralSimilarity', 0);
}

export const findSimilarTerms = (terms, targetTermKey, maxResults = 10) => {
    return errorHandler.executeSync(() => {
        const targetTerm = terms.get(targetTermKey);
        if (!targetTerm?.embedding) return [];

        const {
            REGULARITY_BOOST,
            STRUCTURAL_SIMILARITY_WEIGHT
        } = config.temporal;

        // Pre-filter terms that have embeddings for better performance
        const termEntries = [];
        for (const [key, term] of terms.entries()) {
            if (key !== targetTermKey && term.embedding) {
                termEntries.push([key, term]);
            }
        }

        // Use map for better performance than chained array methods
        const similarities = [];
        for (const [key, term] of termEntries) {
            const semantic = cosineSimilarity(targetTerm.embedding, term.embedding);
            const structural = structuralSimilarity(targetTermKey, key);
            similarities.push({
                termKey: key,
                similarity: REGULARITY_BOOST * semantic + STRUCTURAL_SIMILARITY_WEIGHT * structural
            });
        }

        // Sort and slice in one operation for better performance
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }, 'findSimilarTerms', []);
}
