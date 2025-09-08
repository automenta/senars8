/**
 * Unary operator parsing functions
 */

/**
 * Check if the current token is a unary operator
 * @param {object} parser - The parser instance
 * @returns {boolean} True if the current token is a unary operator
 */
function matchUnaryOperator(parser) {
    return ['negation'].includes(parser.current.type);
}

/**
 * Parse a unary operator
 * @param {object} parser - The parser instance
 * @returns {object} The parsed unary operator
 */
function parseUnaryOperator(parser) {
    const operatorType = parser.current.type;
    parser.consume(operatorType);
    parser.consume('comma');
    const term = parser.parseTerm();
    parser.consume('rparen');
    return {type: getUnaryOperatorType(operatorType), term};
}

/**
 * Map operator token types to AST node types
 * @param {string} operator - The operator token type
 * @returns {string} The AST node type
 */
function getUnaryOperatorType(operator) {
    const mapping = {
        'negation': 'Negation'
    };
    return mapping[operator] || operator;
}

module.exports = {
    matchUnaryOperator,
    parseUnaryOperator,
    getUnaryOperatorType
};