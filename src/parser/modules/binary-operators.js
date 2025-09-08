/**
 * Binary operator parsing functions
 */

/**
 * Check if the current token is a binary operator
 * @param {object} parser - The parser instance
 * @returns {boolean} True if the current token is a binary operator
 */
function matchBinaryOperator(parser) {
    return [
        'conjunction', 'sequentialConjunction', 'parallelConjunction',
        'disjunction', 'extensionalDifference', 'intensionalDifference',
        'product'
    ].includes(parser.current.type);
}

/**
 * Parse a binary operator
 * @param {object} parser - The parser instance
 * @returns {object} The parsed binary operator
 */
function parseBinaryOperator(parser) {
    const operatorType = parser.current.type;
    parser.consume(operatorType);
    parser.consume('comma');
    const terms = parser.parseTermList();
    parser.consume('rparen');
    return {type: getBinaryOperatorType(operatorType), terms};
}

/**
 * Map operator token types to AST node types
 * @param {string} operator - The operator token type
 * @returns {string} The AST node type
 */
function getBinaryOperatorType(operator) {
    const mapping = {
        'conjunction': 'Conjunction',
        'sequentialConjunction': 'SequentialConjunction',
        'parallelConjunction': 'ParallelConjunction',
        'disjunction': 'Disjunction',
        'extensionalDifference': 'ExtensionalDifference',
        'intensionalDifference': 'IntensionalDifference',
        'product': 'Product'
    };
    return mapping[operator] || operator;
}

module.exports = {
    matchBinaryOperator,
    parseBinaryOperator,
    getBinaryOperatorType
};