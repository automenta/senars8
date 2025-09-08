/**
 * Special compound term parsing functions
 */

/**
 * Parse an inheritance relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed inheritance relation
 */
function parseInheritance(parser, subject) {
    parser.consume('arrow');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Inheritance', subject, predicate};
}

/**
 * Parse an implication relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed implication relation
 */
function parseImplication(parser, subject) {
    parser.consume('implies');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Implication', subject, predicate};
}

/**
 * Parse an instance relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed instance relation
 */
function parseInstance(parser, subject) {
    parser.consume('instance');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Instance', subject, predicate};
}

/**
 * Parse a property relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed property relation
 */
function parseProperty(parser, subject) {
    parser.consume('property');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Property', subject, predicate};
}

/**
 * Parse an equivalence relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed equivalence relation
 */
function parseEquivalence(parser, subject) {
    parser.consume('equivalence');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Equivalence', subject, predicate};
}

/**
 * Parse a similarity relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed similarity relation
 */
function parseSimilarity(parser, subject) {
    parser.consume('similarity');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Similarity', subject, predicate};
}

/**
 * Parse a retrospective implication
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed retrospective implication
 */
function parseRetrospectiveImplication(parser, subject) {
    parser.consume('retrospection');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'RetrospectiveImplication', subject, predicate};
}

/**
 * Parse a predictive implication
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed predictive implication
 */
function parsePredictiveImplication(parser, subject) {
    parser.consume('prediction');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'PredictiveImplication', subject, predicate};
}

/**
 * Parse a concurrent implication
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed concurrent implication
 */
function parseConcurrentImplication(parser, subject) {
    parser.consume('concurrent');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'ConcurrentImplication', subject, predicate};
}

/**
 * Parse an until relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed until relation
 */
function parseUntil(parser, subject) {
    parser.consume('until');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Until', subject, predicate};
}

/**
 * Parse a since relation
 * @param {object} parser - The parser instance
 * @param {object} subject - The subject term
 * @returns {object} The parsed since relation
 */
function parseSince(parser, subject) {
    parser.consume('since');
    const predicate = parser.parseTerm();
    parser.consume('rparen');
    return {type: 'Since', subject, predicate};
}

module.exports = {
    parseInheritance,
    parseImplication,
    parseInstance,
    parseProperty,
    parseEquivalence,
    parseSimilarity,
    parseRetrospectiveImplication,
    parsePredictiveImplication,
    parseConcurrentImplication,
    parseUntil,
    parseSince
};