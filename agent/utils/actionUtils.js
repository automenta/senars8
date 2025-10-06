const parseSequentialConjunction = (term) => {
    const [nameTerm, ...paramTerms] = term.terms;
    if (!nameTerm) return null;
    return {
        tool: nameTerm.key,
        parameters: paramTerms.map(t => t.key.replaceAll('"', ''))
    };
};

const termToActionParsers = new Map([
    ['Atomic', (term) => ({tool: term.key, parameters: []})],
    ['SequentialConjunction', parseSequentialConjunction],
    ['Conjunction', parseSequentialConjunction]
]);

export const parseTermToAction = (term, logger) => {
    if (!term) return null;

    const parser = termToActionParsers.get(term.type);
    if (parser) {
        try {
            return parser(term);
        } catch (error) {
            logger?.error(`Error parsing term of type '${term.type}':`, {term, error});
            return null;
        }
    }

    logger?.warn(`Cannot parse term of type '${term.type}' to an action:`, term);
    return null;
};