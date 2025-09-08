const {cosineSimilarity} = require('./math');
const config = require('../config');

function structuralSimilarity(termKey1, termKey2) {
    if (termKey1 === termKey2) return 1.0;

    const getSubstrings = (str) => {
        const substrings = new Set();
        for (let i = 0; i < str.length - 1; i++) {
            substrings.add(str.substring(i, i + 2));
        }
        return substrings;
    };

    const subs1 = getSubstrings(termKey1);
    const subs2 = getSubstrings(termKey2);
    const intersection = new Set([...subs1].filter(sub => subs2.has(sub)));

    const totalLength = subs1.size + subs2.size;
    return totalLength > 0 ? (2 * intersection.size) / totalLength : 0;
}

function findSimilarTerms(terms, targetTermKey, maxResults = 10) {
    const targetTerm = terms.get(targetTermKey);
    if (!targetTerm || !targetTerm.embedding) return [];

    const similarities = Array.from(terms.entries())
        .filter(([key, term]) => key !== targetTermKey && term.embedding)
        .map(([key, term]) => {
            const semantic = cosineSimilarity(targetTerm.embedding, term.embedding);
            const structural = structuralSimilarity(targetTermKey, key);
            return {termKey: key, similarity: config.temporal.REGULARITY_BOOST * semantic + config.temporal.STRUCTURAL_SIMILARITY_WEIGHT * structural};
        });

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, maxResults);
}

function termsEqual(term1, term2) {
    return term1.key === term2.key &&
        term1.complexity === term2.complexity &&
        term1.embedding.length === term2.embedding.length &&
        term1.embedding.every((v, i) => Math.abs(v - term2.embedding[i]) < 1e-6);
}

function buildTermKey(pTerm) {
    if (!pTerm || !pTerm.type) return '';

    const build = buildTermKey; // Alias for recursion
    const buildList = (terms) => terms.map(build).join(',');

    switch (pTerm.type) {
        case 'Atomic':
            return pTerm.key;
        case 'Inheritance':
            return `(${build(pTerm.subject)} --> ${build(pTerm.predicate)})`;
        case 'Implication':
            return `(${build(pTerm.subject)} ==> ${build(pTerm.predicate)})`;
        case 'Equivalence':
            return `(${build(pTerm.subject)} <=> ${build(pTerm.predicate)})`;
        case 'Similarity':
            return `(${build(pTerm.subject)} <-> ${build(pTerm.predicate)})`;
        case 'Instance':
            return `(${build(pTerm.subject)} {-- ${build(pTerm.predicate)})`;
        case 'Property':
            return `(${build(pTerm.subject)} --} ${build(pTerm.predicate)})`;
        case 'PredictiveImplication':
            return `(${build(pTerm.subject)} =\> ${build(pTerm.predicate)})`;
        case 'RetrospectiveImplication':
            return `(${build(pTerm.subject)} =/> ${build(pTerm.predicate)})`;
        case 'ConcurrentImplication':
            return `(${build(pTerm.subject)} =<> ${build(pTerm.predicate)})`;
        case 'Until':
            return `(${build(pTerm.subject)} until ${build(pTerm.predicate)})`;
        case 'Since':
            return `(${build(pTerm.subject)} since ${build(pTerm.predicate)})`;

        case 'Negation':
            return `(--,${build(pTerm.term)})`;
        case 'Always':
            return `(always,${build(pTerm.term)})`;
        case 'Eventually':
            return `(eventually,${build(pTerm.term)})`;
        case 'Next':
            return `(next,${build(pTerm.term)})`;
        case 'Previous':
            return `(previous,${build(pTerm.term)})`;

        case 'Conjunction':
            return `(&,${buildList(pTerm.terms || [])})`;
        case 'Disjunction':
            return `(||,${buildList(pTerm.terms || [])})`;
        case 'SequentialConjunction':
            return `(&&,${buildList(pTerm.terms || [])})`;
        case 'ParallelConjunction':
            return `(&|,${buildList(pTerm.terms || [])})`;
        case 'ExtensionalDifference':
            return `(#,${buildList(pTerm.terms || [])})`;
        case 'IntensionalDifference':
            return `(\\,${buildList(pTerm.terms || [])})`;
        case 'Product':
            return `(*,${buildList(pTerm.terms || [])})`;

        case 'ExtensionalSet':
            return `{${buildList(pTerm.terms || [])}}`;
        case 'IntensionalSet':
            return `[${buildList(pTerm.terms || [])}]`;

        case 'IndependentVariable':
            return pTerm.name;
        case 'DependentVariable':
            return `#${pTerm.name}`;
        case 'QueryVariable':
            return `?${pTerm.name}`;

        default:
            throw new Error(`buildTermKey does not support type: ${pTerm.type}`);
    }
}

module.exports = {
    structuralSimilarity,
    findSimilarTerms,
    termsEqual,
    buildTermKey
};