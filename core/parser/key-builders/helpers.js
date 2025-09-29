/**
 * Helper function to build a term key for an infix operator.
 * @param {Function} termKey - The function to generate a term key.
 * @param {object} pTerm - The parsed term structure.
 * @param {string} op - The operator symbol.
 * @param {boolean} silent - If true, suppresses errors.
 * @returns {string} The generated term key.
 */
export const termKeyInfix = (termKey, pTerm, op, silent) => `(${termKey(pTerm.subject, silent)} ${op} ${termKey(pTerm.predicate, silent)})`;

/**
 * Helper function to build a comma-separated list of term keys.
 * @param {Function} termKey - The function to generate a term key.
 * @param {Array} terms - An array of parsed term structures.
 * @param {boolean} silent - If true, suppresses errors.
 * @returns {string} The generated list of term keys.
 */
export const termList = (termKey, terms, silent) => (terms?.length ? terms.map(t => termKey(t, silent)).join(',') : '');

/**
 * Helper function to build a term key for a unary operator.
 * @param {Function} termKey - The function to generate a term key.
 * @param {string} op - The operator symbol.
 * @param {object} pTerm - The parsed term structure.
 * @param {boolean} silent - If true, suppresses errors.
 * @returns {string} The generated term key.
 */
export const unaryOp = (termKey, op, pTerm, silent) => `(${op}${termKey(pTerm.term, silent)})`;

/**
 * Helper function to build a term key for a list-based operator.
 * @param {Function} termKey - The function to generate a term key.
 * @param {string} op - The operator symbol.
 * @param {object} pTerm - The parsed term structure.
 * @param {boolean} silent - If true, suppresses errors.
 * @returns {string} The generated term key.
 */
export const listOp = (termKey, op, pTerm, silent) => `(${op}${termList(termKey, pTerm.terms || [], silent)})`;