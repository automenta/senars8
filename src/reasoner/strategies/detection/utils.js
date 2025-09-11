export function analyzeBinaryStatementConflict(task1, task2, parsed1, parsed2, statementType, conflictType) {
    if (parsed1.type !== statementType || parsed2.type !== statementType || parsed1.subject.key !== parsed2.subject.key) {
        return null;
    }
    const pred1 = parsed1.predicate;
    const pred2 = parsed2.predicate;
    const check = (p1, p2) => p1.type === 'Negation' && p1.term.key === p2.key;
    if (check(pred1, pred2) || check(pred2, pred1)) {
        return {
            type: conflictType,
            details: `${statementType} conflict: "${task1.termKey}" vs "${task2.termKey}"`
        };
    }
    return null;
}

export function analyzeSetLikeConflict(task1, task2, parsed1, parsed2, setType, conflictType, conflictDetailsPrefix) {
    if (parsed1.type !== setType || parsed2.type !== setType) return null;
    const terms1 = new Set((parsed1.terms || []).map(t => t.key));
    const terms2 = (parsed2.terms || []).map(t => t.key);

    for (const termKey of terms2) {
        if (terms1.has(`(--,${termKey})`)) {
            return {
                type: conflictType,
                details: `${conflictDetailsPrefix} on element ${termKey}`
            };
        }
    }
    return null;
}

export function analyzeCompoundTermConflict(task1, task2, parsed1, parsed2, expectedType, conflictType) {
    if (parsed1.type !== expectedType || parsed2.type !== expectedType) return null;
    const terms1 = new Map((parsed1.terms || []).map(t => [t.key.replace('--', ''), t]));
    const terms2 = new Map((parsed2.terms || []).map(t => [t.key.replace('--', ''), t]));

    for (const [key, term1] of terms1.entries()) {
        const term2 = terms2.get(key);
        if (term2 && term1.type !== term2.type) {
            return {
                type: conflictType,
                details: `${expectedType} conflict on element ${key}`
            };
        }
    }
    return null;
}
