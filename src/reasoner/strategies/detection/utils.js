import Term from '../../../core/Term.js';

function analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, type, conflictType) {
    if (parsed1.type !== type || parsed2.type !== 'Negation') return null;

    const negatedTermKey = Term.termKey(parsed2.term);
    if (task1.termKey === negatedTermKey) {
        return {
            type: conflictType,
            details: `Conflict between "${task1.termKey}" and its negation.`,
        };
    }
    return null;
}

function analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, type, conflictType) {
    if (parsed1.type !== type || parsed2.type !== 'Negation') return null;
    const negatedTermKey = Term.termKey(parsed2.term);
    if (task1.termKey === negatedTermKey) {
        return {
            type: conflictType,
            details: `Conflict between compound term "${task1.termKey}" and its negation.`,
        };
    }
    return null;
}

function analyzeSetLikeConflict(task1, task2, parsed1, parsed2, type, conflictType, details) {
    if (parsed1.type !== type || parsed2.type !== type) return null;

    const terms1 = new Set(parsed1.terms.map(t => Term.termKey(t)));
    const terms2 = new Set(parsed2.terms.map(t => Term.termKey(t)));
    if (terms1.size !== terms2.size || ![...terms1].every(t => terms2.has(t))) {
        return {
            type: conflictType,
            details: `${details}: "${task1.termKey}" vs "${task2.termKey}"`,
        };
    }
    return null;
}

export {
    analyzeBinaryStatementConflict,
    analyzeCompoundTermConflict,
    analyzeSetLikeConflict
};
