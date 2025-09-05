function buildTermKey(parsedTerm) {
    if (!parsedTerm || !parsedTerm.type) {
        return '';
    }

    switch (parsedTerm.type) {
        case 'Atomic':
            return parsedTerm.key;
        case 'Inheritance':
            return `(${buildTermKey(parsedTerm.subject)} --> ${buildTermKey(parsedTerm.predicate)})`;
        case 'Negation':
            // For negation, we wrap the inner term with --
            return `(--,${buildTermKey(parsedTerm.term)})`;
        case 'Conjunction':
            if (parsedTerm.terms && parsedTerm.terms.length > 0) {
                const termKeys = parsedTerm.terms.map(term => buildTermKey(term));
                return `(&, ${termKeys.join(', ')})`;
            }
            return '(&)';
        case 'Disjunction':
            if (parsedTerm.terms && parsedTerm.terms.length > 0) {
                const termKeys = parsedTerm.terms.map(term => buildTermKey(term));
                return `(||, ${termKeys.join(', ')})`;
            }
            return `(||)`;
        case 'Implication':
            return `(${buildTermKey(parsedTerm.subject)} ==> ${buildTermKey(parsedTerm.predicate)})`;
        case 'Equivalence':
            return `(${buildTermKey(parsedTerm.subject)} <=> ${buildTermKey(parsedTerm.predicate)})`;
        case 'SequentialConjunction':
            if (parsedTerm.terms && parsedTerm.terms.length > 0) {
                const termKeys = parsedTerm.terms.map(term => buildTermKey(term));
                return `(&/, ${termKeys.join(', ')})`;
            }
            return `(&/)`;
        case 'ParallelConjunction':
            if (parsedTerm.terms && parsedTerm.terms.length > 0) {
                const termKeys = parsedTerm.terms.map(term => buildTermKey(term));
                return `(&|, ${termKeys.join(', ')})`;
            }
            return `(&|)`;
        case 'Always':
            return `(always, ${buildTermKey(parsedTerm.term)})`;
        case 'Eventually':
            return `(eventually, ${buildTermKey(parsedTerm.term)})`;
        case 'Next':
            return `(next, ${buildTermKey(parsedTerm.term)})`;
        case 'Previous':
            return `(previous, ${buildTermKey(parsedTerm.term)})`;
        case 'Until':
            return `(${buildTermKey(parsedTerm.subject)} until ${buildTermKey(parsedTerm.predicate)})`;
        case 'Since':
            return `(${buildTermKey(parsedTerm.subject)} since ${buildTermKey(parsedTerm.predicate)})`;
        default:
            throw new Error(`buildTermKey does not support type: ${parsedTerm.type}`);
    }
}

module.exports = {
    buildTermKey
};

module.exports = {
    buildTermKey
};
