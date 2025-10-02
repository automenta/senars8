/**
 * @typedef {import('../../core/parser/types').Term} Term
 */

/**
 * @typedef {Object} Action
 * @property {string} tool - The name of the tool to execute.
 * @property {Array<string>} parameters - The parameters for the tool.
 */

/**
 * Parses a sequential conjunction term into an action.
 * @param {Term} term - The term to parse.
 * @returns {Action|null}
 */
function parseSequentialConjunction(term) {
    const [nameTerm, ...paramTerms] = term.terms;
    if (!nameTerm) {
        return null;
    }
    return {
        tool: nameTerm.key,
        parameters: paramTerms.map(t => t.key.replaceAll('"', '')),
    };
}

const termToActionParsers = new Map([
    ['Atomic', (term) => ({ tool: term.key, parameters: [] })],
    ['SequentialConjunction', parseSequentialConjunction],
    ['Conjunction', parseSequentialConjunction],
]);

/**
 * Parses a term from a plan step into an executable action.
 * @param {Term} term - The term to parse.
 * @param {object} [logger] - Optional logger instance.
 * @returns {Action|null} The parsed action or null if parsing fails.
 */
export function parseTermToAction(term, logger) {
    if (!term) {
        return null;
    }

    const parser = termToActionParsers.get(term.type);
    if (parser) {
        try {
            return parser(term);
        } catch (error) {
            logger?.error(`Error parsing term of type '${term.type}':`, { term, error });
            return null;
        }
    }

    logger?.warn(`Cannot parse term of type '${term.type}' to an action:`, term);
    return null;
}